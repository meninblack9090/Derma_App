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
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToDermaConversations,
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

export default function MessagesScreen({ route }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dermaMessages, setDermaMessages] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDermaConversations(user.uid, setDermaMessages);
    return unsub;
  }, [user]);

  // Open chat directly when navigated from another screen
  useEffect(() => {
    const dc = route?.params?.directChat;
    if (dc?.id) {
      setActiveChat({ id: dc.id, patientId: dc.patientId, patientName: dc.patientName });
    }
  }, [route?.params?._ts]);

  useEffect(() => {
    if (!activeChat) { setChatMessages([]); return; }
    markConversationRead(activeChat.id, 'derma').catch(() => {});
    const unsub = subscribeToMessages(activeChat.id, setChatMessages);
    return unsub;
  }, [activeChat]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await sendChatMessage(activeChat.id, user.uid, 'derma', text);
    } catch {
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const filtered = dermaMessages.filter((m) =>
    (m.patientName ?? '').toLowerCase().includes(search.toLowerCase())
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
        {/* Chat header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setActiveChat(null)}>
            <Ionicons name="arrow-back" size={20} color={colors.slate700} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <ProfileAvatar gender={undefined} role="patient" size={36} seed={activeChat.patientId || activeChat.patientName} />
            <View>
              <Text style={styles.chatHeaderName}>{activeChat.patientName}</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: colors.emerald }]} />
                <Text style={styles.onlineText}>Patient</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
        >
          {chatMessages.length === 0 && (
            <View style={styles.chatEmpty}>
              <View style={styles.chatEmptyIcon}>
                <Ionicons name="chatbubbles-outline" size={44} color={colors.teal} />
              </View>
              <Text style={styles.chatEmptyTitle}>Start a conversation</Text>
              <Text style={styles.chatEmptySub}>Send a message to {activeChat.patientName}</Text>
            </View>
          )}
          {chatMessages.map((msg) => {
            const isDoctor = msg.senderRole === 'derma' || msg.senderId === user?.uid;
            return (
              <View key={msg.id} style={[styles.msgRow, isDoctor && styles.msgRowRight]}>
                {!isDoctor && (
                  <ProfileAvatar gender={undefined} role="patient" size={24} seed={activeChat.patientId || activeChat.patientName} />
                )}
                <View style={[styles.msgBubble, isDoctor ? styles.msgBubbleDoctor : styles.msgBubblePatient]}>
                  <Text style={[styles.msgText, isDoctor && styles.msgTextDoctor]}>{msg.text}</Text>
                  <Text style={[styles.msgTime, isDoctor && styles.msgTimeDoctor]}>
                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
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
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {dermaMessages.reduce((sum, m) => sum + (m.unreadByDerma || 0), 0)} new
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search patients..."
          placeholderTextColor={colors.slate300}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.slate300} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Patient conversations will appear here</Text>
          </View>
        ) : (
          filtered.map((msg) => {
            const initials = (msg.patientName ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            const hasUnread = (msg.unreadByDerma ?? 0) > 0;
            return (
              <TouchableOpacity
                key={msg.id}
                style={[styles.msgCard, hasUnread && styles.msgCardUnread]}
                onPress={() => setActiveChat(msg)}
              >
                <View style={styles.convAvatarWrap}>
                  <ProfileAvatar gender={undefined} role="patient" size={48} seed={msg.patientId || msg.patientName} />
                  <View style={styles.onlineDotCard} />
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTopRow}>
                    <Text style={[styles.convName, hasUnread && styles.convNameBold]}>{msg.patientName}</Text>
                    <Text style={[styles.convTime, hasUnread && { color: colors.teal }]}>{relativeTime(msg.lastTime)}</Text>
                  </View>
                  <Text style={[styles.convPreview, hasUnread && styles.convPreviewBold]} numberOfLines={1}>
                    {msg.lastMessage || 'No messages yet'}
                  </Text>
                </View>
                {hasUnread && (
                  <View style={styles.unreadCount}>
                    <Text style={styles.unreadCountText}>{msg.unreadByDerma}</Text>
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

  // ── Conversation list ──────────────────────────────────────────────────────
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
  unreadBadge: { backgroundColor: colors.tealLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  unreadText: { fontSize: 12, fontWeight: '700', color: colors.teal },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate800 },

  scroll: { paddingBottom: 32 },

  msgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    backgroundColor: colors.white,
  },
  msgCardUnread: { backgroundColor: '#f0fdfa' },
  convAvatarWrap: { position: 'relative', marginRight: 14 },
  convAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText: { fontSize: 18, fontWeight: '800', color: colors.white },
  onlineDotCard: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.emerald,
    borderWidth: 2.5, borderColor: colors.white,
  },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontSize: 15, fontWeight: '600', color: colors.slate800 },
  convNameBold: { fontWeight: '800', color: colors.slate900 },
  convTime: { fontSize: 11, color: colors.slate400 },
  convPreview: { fontSize: 13, color: colors.slate500 },
  convPreviewBold: { fontWeight: '700', color: colors.slate700 },
  unreadCount: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: 10,
  },
  unreadCountText: { fontSize: 11, fontWeight: '800', color: colors.white },

  // ── Chat view ──────────────────────────────────────────────────────────────
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatAvatarWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.tealLight,
    alignItems: 'center', justifyContent: 'center',
  },
  chatHeaderName: { fontSize: 15, fontWeight: '700', color: colors.slate900 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11, color: colors.slate400 },

  chatArea: { flex: 1, backgroundColor: colors.slate50 },
  chatContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, flexGrow: 1 },

  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  chatEmptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.tealLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  chatEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate700, marginBottom: 4 },
  chatEmptySub: { fontSize: 13, color: colors.slate400 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowRight: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  msgBubblePatient: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderBottomLeftRadius: 4 },
  msgBubbleDoctor: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  msgText: { fontSize: 14, color: colors.slate800, lineHeight: 20 },
  msgTextDoctor: { color: colors.white },
  msgTime: { fontSize: 10, color: colors.slate400, marginTop: 4, textAlign: 'right' },
  msgTimeDoctor: { color: 'rgba(255,255,255,0.65)' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate800,
    borderWidth: 1,
    borderColor: colors.slate200,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.slate300 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.slate500 },
  emptySub: { fontSize: 12, color: colors.slate400 },
});
