import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { faqItems } from '../../data/constants';

const categories = ['All', 'Scanning', 'Consultations', 'Subscription', 'Privacy'];

export default function HelpScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = faqItems.filter((f) => {
    const matchCat = selectedCat === 'All' || f.category === selectedCat;
    const matchSearch = f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.slate700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search help articles..."
            placeholderTextColor={colors.slate300}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.slate400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick contact */}
        <View style={styles.contactRow}>
          {[
            { icon: 'chatbubble-ellipses-outline', label: 'Live Chat', color: colors.primary, bg: colors.primaryLight },
            { icon: 'mail-outline', label: 'Email Us', color: colors.teal, bg: colors.tealLight },
            { icon: 'call-outline', label: 'Call Support', color: '#8b5cf6', bg: '#f5f3ff' },
          ].map((c) => (
            <TouchableOpacity key={c.label} style={styles.contactCard}>
              <View style={[styles.contactIcon, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <Text style={styles.contactLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          style={styles.catScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCat === cat && styles.catChipActive]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.catChipText, selectedCat === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>
          Frequently Asked Questions {search ? `(${filtered.length} results)` : ''}
        </Text>

        <View style={styles.faqList}>
          {filtered.length > 0 ? filtered.map((item) => {
            const isExp = expanded === item.id;
            return (
              <View key={item.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => setExpanded(isExp ? null : item.id)}
                >
                  <View style={styles.faqCatBadge}>
                    <Text style={styles.faqCatText}>{item.category}</Text>
                  </View>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={isExp ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.slate400}
                  />
                </TouchableOpacity>
                {isExp && (
                  <View style={styles.faqBody}>
                    <View style={styles.faqDivider} />
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                    <TouchableOpacity style={styles.helpfulRow}>
                      <Text style={styles.helpfulText}>Was this helpful?</Text>
                      <View style={styles.helpfulBtns}>
                        <TouchableOpacity style={styles.thumbBtn}>
                          <Ionicons name="thumbs-up-outline" size={16} color={colors.emerald} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.thumbBtn}>
                          <Ionicons name="thumbs-down-outline" size={16} color={colors.red} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.slate300} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySub}>Try a different search term or category</Text>
            </View>
          )}
        </View>

        {/* Still need help */}
        <View style={styles.needHelpCard}>
          <Ionicons name="headset-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.needHelpTitle}>Still need help?</Text>
            <Text style={styles.needHelpSub}>Our support team responds within 24 hours</Text>
          </View>
          <TouchableOpacity style={styles.contactSupportBtn}>
            <Text style={styles.contactSupportText}>Contact</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate800 },

  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  contactCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  contactIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 11, fontWeight: '600', color: colors.slate700, textAlign: 'center' },

  catScroll: { marginBottom: 16 },
  catRow: { gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  catChipTextActive: { color: colors.white },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800, marginBottom: 12 },

  faqList: { gap: 10, marginBottom: 20 },
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  faqCatBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  faqCatText: { fontSize: 9, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  faqQuestion: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.slate800, lineHeight: 18 },

  faqBody: { paddingHorizontal: 14, paddingBottom: 14 },
  faqDivider: { height: 1, backgroundColor: colors.slate100, marginBottom: 10 },
  faqAnswer: { fontSize: 13, color: colors.slate600, lineHeight: 20, marginBottom: 12 },
  helpfulRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helpfulText: { fontSize: 12, color: colors.slate400 },
  helpfulBtns: { flexDirection: 'row', gap: 8 },
  thumbBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate600 },
  emptySub: { fontSize: 13, color: colors.slate400 },

  needHelpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  needHelpTitle: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  needHelpSub: { fontSize: 11, color: colors.slate600 },
  contactSupportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  contactSupportText: { fontSize: 12, fontWeight: '700', color: colors.white },
});
