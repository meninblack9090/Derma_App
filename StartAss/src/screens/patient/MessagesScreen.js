import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToPatientConversations,
  subscribeToMessages,
  sendChatMessage,
  markConversationRead,
} from '../../firebase/firestore';

const relativeTime = (ts) => {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function PatientMessagesScreen({ route }) {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPatientConversations(user.uid, setConversations);
    return unsub;
  }, [user]);

  // Open chat directly when navigated from another screen
  useEffect(() => {
    const dc = route?.params?.directChat;
    if (dc?.id) {
      setActiveChat({ id: dc.id, dermaId: dc.dermaId, dermaName: dc.dermaName });
    }
  }, [route?.params?._ts]);

  useEffect(() => {
    if (!activeChat) { setChatMessages([]); return; }
    markConversationRead(activeChat.id, 'patient').catch(() => {});
    const unsub = subscribeToMessages(activeChat.id, setChatMessages);
    return unsub;
  }, [activeChat]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await sendChatMessage(activeChat.id, user.uid, 'patient', text);
    } catch (e) {
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) =>
    (c.dermaName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const scrollRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (chatMessages.length > 0 && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 150);
    }
  }, [chatMessages]);

  if (activeChat) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { setActiveChat(null); setChatMessages([]); }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.slate700} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <ProfileAvatar gender={undefined} role="derma" size={36} seed={activeChat.dermaId || activeChat.dermaName} />
            <View>
              <Text style={styles.chatHeaderName}>{activeChat.dermaName}</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: colors.emerald }]} />
                <Text style={styles.onlineText}>Dermatologist</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
        >
          {chatMessages.length === 0 && (
            <View style={styles.chatEmpty}>
              <View style={styles.chatEmptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={44} color={colors.primary} />
              </View>
              <Text style={styles.chatEmptyTitle}>Start a conversation</Text>
              <Text style={styles.chatEmptyText}>Send a message to {activeChat.dermaName}</Text>
            </View>
          )}
          {chatMessages.map((msg) => {
            const isMe = msg.senderRole === 'patient' || msg.senderId === user?.uid;
            return (
              <View key={msg.id} style={[styles.msgRow, isMe && styles.msgRowRight]}>
                {!isMe && (
                  <ProfileAvatar gender={undefined} role="derma" size={24} seed={activeChat.dermaId || activeChat.dermaName} />
                )}
                <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                  <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{msg.text}</Text>
                  <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inputRow, { paddingBottom: 10 + Math.max(insets.bottom, 16) }]}>
            <TextInput
              style={styles.chatInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={colors.slate300}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {conversations.reduce((s, c) => s + (c.unreadByPatient || 0), 0)} new
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search doctors..."
          placeholderTextColor={colors.slate300}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <LinearGradient
              colors={[colors.primaryLight, colors.white]}
              style={styles.emptyGrad}
            >
              <Ionicons name="chatbubbles-outline" size={48} color={colors.primary} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                After booking a consultation, you can message your dermatologist here
              </Text>
            </LinearGradient>
          </View>
        ) : (
          filtered.map((conv) => {
            const initials = (conv.dermaName ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            const hasUnread = (conv.unreadByPatient ?? 0) > 0;
            return (
              <TouchableOpacity
                key={conv.id}
                style={[styles.convCard, hasUnread && styles.convCardUnread]}
                onPress={() => setActiveChat(conv)}
              >
                <View style={styles.convAvatarWrap}>
                  <ProfileAvatar gender={undefined} role="derma" size={48} seed={conv.dermaId || conv.dermaName} />
                  <View style={styles.onlineDotCard} />
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convHeader}>
                    <Text style={[styles.convName, hasUnread && styles.convNameBold]}>{conv.dermaName}</Text>
                    <Text style={[styles.convTime, hasUnread && { color: colors.primary }]}>{relativeTime(conv.lastTime)}</Text>
                  </View>
                  <Text style={styles.convSpecialty}>Dermatologist</Text>
                  <Text style={[styles.convPreview, hasUnread && styles.convPreviewBold]} numberOfLines={1}>
                    {conv.lastMessage || 'No messages yet'}
                  </Text>
                </View>
                {hasUnread && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conv.unreadByPatient}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.slate900 },
  headerBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.slate800 },

  scroll: { paddingBottom: 24 },

  emptyBox: { marginTop: 24, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden' },
  emptyGrad: {
    alignItems: 'center',
    padding: 40,
    gap: 10,
    borderRadius: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  emptySub: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    backgroundColor: colors.white,
  },
  convCardUnread: { backgroundColor: '#faf5ff' },
  convAvatarWrap: { position: 'relative', marginRight: 14 },
  convAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convAvatarText: { fontSize: 18, fontWeight: '800', color: colors.white },
  onlineDotCard: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.emerald,
    borderWidth: 2.5, borderColor: colors.white,
  },
  convInfo: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convName: { fontSize: 15, fontWeight: '600', color: colors.slate800 },
  convNameBold: { fontWeight: '800', color: colors.slate900 },
  convTime: { fontSize: 11, color: colors.slate400 },
  convSpecialty: { fontSize: 11, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  convPreview: { fontSize: 13, color: colors.slate500 },
  convPreviewBold: { fontWeight: '700', color: colors.slate700 },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: 10,
  },
  unreadText: { fontSize: 10, color: colors.white, fontWeight: '700' },

  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chatAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderName: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11, color: colors.slate400 },

  chatArea: { flex: 1, backgroundColor: colors.slate50 },
  chatContent: { padding: 16, gap: 10, flexGrow: 1 },
  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  chatEmptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  chatEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate700, marginBottom: 4 },
  chatEmptyText: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 20,
  },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowRight: { flexDirection: 'row-reverse' },
  msgAvatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: {
    maxWidth: '72%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  msgBubbleOther: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate100,
    borderBottomLeftRadius: 4,
  },
  msgBubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  msgText: { fontSize: 14, color: colors.slate800, lineHeight: 20 },
  msgTextMe: { color: colors.white },
  msgTime: { fontSize: 10, color: colors.slate400, marginTop: 4 },
  msgTimeMe: { color: 'rgba(255,255,255,0.65)' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate800,
    borderWidth: 1,
    borderColor: colors.slate200,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.slate300 },
});
