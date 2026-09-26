import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToPrescriptions,
} from '../../firebase/prescriptions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusMeta = (rx) => {
  if (rx.status === 'used') return { label: 'Used', color: colors.emerald, bg: '#ecfdf5', icon: 'checkmark-circle' };
  if (rx.status === 'expired') return { label: 'Expired', color: colors.slate400, bg: colors.slate100, icon: 'time-outline' };
  if (rx.discount_used) return { label: 'Used', color: colors.emerald, bg: '#ecfdf5', icon: 'checkmark-circle' };
  return { label: 'Active', color: colors.teal, bg: colors.tealLight, icon: 'document-text-outline' };
};

const isDiscountValid = (rx) => {
  if (!rx.has_discount || !rx.discount_code) return false;
  if (rx.discount_used || rx.status === 'used' || rx.status === 'expired') return false;
  const expires = rx.discount_expires_at?.toDate
    ? rx.discount_expires_at.toDate()
    : rx.discount_expires_at ? new Date(rx.discount_expires_at) : null;
  if (!expires) return false;
  return expires > new Date();
};

const formatPrice = (n) =>
  n !== undefined && n !== null ? `₱${Number(n).toFixed(2)}` : '—';

const timeLeft = (rx) => {
  const expires = rx.discount_expires_at?.toDate
    ? rx.discount_expires_at.toDate()
    : rx.discount_expires_at ? new Date(rx.discount_expires_at) : null;
  if (!expires) return null;
  const ms = expires - Date.now();
  if (ms <= 0) return 'Expired';
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PatientPrescriptionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPrescriptions(user.uid, setPrescriptions);
    return unsub;
  }, [user]);

  const handleCopyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Discount code "${code}" copied to clipboard.`);
  };

  const activeRx = prescriptions.filter((rx) => rx.status !== 'expired' && rx.status !== 'used');
  const pastRx = prescriptions.filter((rx) => rx.status === 'expired' || rx.status === 'used');

  const renderRxCard = (rx) => {
    const sm = statusMeta(rx);
    const valid = isDiscountValid(rx);
    const tl = valid ? timeLeft(rx) : null;
    return (
      <TouchableOpacity key={rx.id} style={styles.rxCard} onPress={() => setSelectedRx(rx)}>
        {/* Top row */}
        <View style={styles.rxCardTop}>
          <View style={styles.rxDocIcon}>
            <Ionicons name="document-text-outline" size={18} color={colors.teal} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rxDoctor} numberOfLines={1}>Dr. {rx.doctor_name}</Text>
            <Text style={styles.rxMeds} numberOfLines={1}>
              {rx.medications?.map((m) => m.name).filter(Boolean).join(', ') || '—'}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
            <Ionicons name={sm.icon} size={11} color={sm.color} />
            <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
          </View>
        </View>

        {/* Premium discount banner */}
        {valid && rx.discount_code ? (
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={styles.discountBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="pricetag" size={16} color="rgba(255,255,255,0.85)" />
            <View style={{ flex: 1 }}>
              <Text style={styles.discountBannerLabel}>💎 Premium Discount — 50% OFF</Text>
              <Text style={styles.discountBannerCode}>{rx.discount_code}</Text>
            </View>
            <View style={styles.discountTimeBadge}>
              <Text style={styles.discountTimeText}>{tl}</Text>
            </View>
          </LinearGradient>
        ) : rx.has_discount && !valid ? (
          <View style={styles.discountExpiredBanner}>
            <Ionicons name="time-outline" size={14} color={colors.slate400} />
            <Text style={styles.discountExpiredText}>
              {rx.discount_used ? 'Discount already used at pharmacy' : 'Discount expired'}
            </Text>
          </View>
        ) : null}

        {/* Price row */}
        <View style={styles.priceRow}>
          {rx.has_discount ? (
            <>
              <Text style={styles.originalPrice}>{formatPrice(rx.original_price)}</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.slate400} />
              <Text style={styles.finalPrice}>{formatPrice(rx.final_price)}</Text>
              <Text style={styles.savedText}>Save {formatPrice(rx.discount_amount)}</Text>
            </>
          ) : (
            <Text style={styles.finalPrice}>{formatPrice(rx.original_price)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{prescriptions.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {prescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={52} color={colors.slate300} />
            <Text style={styles.emptyTitle}>No prescriptions yet</Text>
            <Text style={styles.emptySub}>
              Prescriptions from your dermatologist will appear here
            </Text>
          </View>
        ) : (
          <>
            {activeRx.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Active</Text>
                {activeRx.map(renderRxCard)}
              </>
            )}
            {pastRx.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Past</Text>
                {pastRx.map(renderRxCard)}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── DETAIL MODAL ─────────────────────────────────────────── */}
      <Modal visible={!!selectedRx} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            {selectedRx && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Prescription</Text>
                  <TouchableOpacity onPress={() => setSelectedRx(null)}>
                    <Ionicons name="close" size={22} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Doctor */}
                  <View style={styles.doctorCard}>
                    <View style={styles.doctorIcon}>
                      <Ionicons name="person-outline" size={20} color={colors.teal} />
                    </View>
                    <View>
                      <Text style={styles.doctorCardName}>Dr. {selectedRx.doctor_name}</Text>
                      <Text style={styles.doctorCardSub}>Dermatologist</Text>
                    </View>
                  </View>

                  {/* Medications */}
                  <Text style={styles.detailSectionTitle}>Medications</Text>
                  {(selectedRx.medications ?? []).map((m, i) => (
                    <View key={i} style={styles.medDetailRow}>
                      <View style={styles.medDetailIndex}>
                        <Text style={styles.medDetailIndexText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medDetailName}>{m.name}</Text>
                        {m.dosage ? <Text style={styles.medDetailSub}>{m.dosage}</Text> : null}
                        {m.instructions ? (
                          <View style={styles.instructionBox}>
                            <Ionicons name="information-circle-outline" size={13} color={colors.slate400} />
                            <Text style={styles.instructionText}>{m.instructions}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))}

                  {/* Pricing */}
                  <Text style={[styles.detailSectionTitle, { marginTop: 16 }]}>Pricing</Text>
                  <View style={styles.pricingBox}>
                    <View style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>Original Price</Text>
                      <Text style={styles.pricingValue}>{formatPrice(selectedRx.original_price)}</Text>
                    </View>
                    {selectedRx.has_discount && (
                      <View style={styles.pricingRow}>
                        <Text style={[styles.pricingLabel, { color: '#7c3aed' }]}>💎 50% Discount</Text>
                        <Text style={[styles.pricingValue, { color: '#7c3aed' }]}>
                          −{formatPrice(selectedRx.discount_amount)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.pricingRow, styles.pricingTotalRow]}>
                      <Text style={styles.pricingTotalLabel}>You Pay</Text>
                      <Text style={styles.pricingTotalValue}>{formatPrice(selectedRx.final_price ?? selectedRx.original_price)}</Text>
                    </View>
                  </View>

                  {/* Discount code section */}
                  {selectedRx.has_discount && selectedRx.discount_code && (
                    <>
                      <Text style={[styles.detailSectionTitle, { marginTop: 16 }]}>Pharmacy Discount Code</Text>

                      {isDiscountValid(selectedRx) ? (
                        <LinearGradient
                          colors={['#4f46e5', '#7c3aed']}
                          style={styles.codeCardGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.codeCardLabel}>💎 Derma Link Premium — 50% OFF</Text>
                          <Text style={styles.codeCardCode}>{selectedRx.discount_code}</Text>
                          <Text style={styles.codeCardExpiry}>
                            ⏱ {timeLeft(selectedRx)} • Show this at the pharmacy counter
                          </Text>
                          <TouchableOpacity
                            style={styles.copyBtn}
                            onPress={() => handleCopyCode(selectedRx.discount_code)}
                          >
                            <Ionicons name="copy-outline" size={16} color="#7c3aed" />
                            <Text style={styles.copyBtnText}>Copy Code</Text>
                          </TouchableOpacity>
                        </LinearGradient>
                      ) : (
                        <View style={styles.codeExpiredCard}>
                          <Ionicons
                            name={selectedRx.discount_used ? 'checkmark-circle' : 'time-outline'}
                            size={28}
                            color={selectedRx.discount_used ? colors.emerald : colors.slate400}
                          />
                          <Text style={styles.codeExpiredText}>
                            {selectedRx.discount_used
                              ? 'This discount was already used at the pharmacy.'
                              : 'This discount code has expired (valid for 24 hours).'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.pharmacyNote}>
                        <Ionicons name="storefront-outline" size={16} color={colors.slate500} />
                        <Text style={styles.pharmacyNoteText}>
                          The pharmacist will visit{' '}
                          <Text style={{ fontWeight: '700' }}>verify.dermalink.com</Text>{' '}
                          to scan your code and apply the discount automatically.
                        </Text>
                      </View>
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  countBadge: { backgroundColor: colors.tealLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700', color: colors.teal },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.slate500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate500 },
  emptySub: { fontSize: 13, color: colors.slate400, textAlign: 'center' },

  rxCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  rxCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rxDocIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center',
  },
  rxDoctor: { fontSize: 14, fontWeight: '700', color: colors.slate800, flexShrink: 1 },
  rxMeds: { fontSize: 11, color: colors.slate500, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },

  discountBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12,
  },
  discountBannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  discountBannerCode: { fontSize: 16, fontWeight: '900', color: colors.white, letterSpacing: 1 },
  discountTimeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  discountTimeText: { fontSize: 10, fontWeight: '700', color: colors.white },

  discountExpiredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.slate100, borderRadius: 10, padding: 10,
  },
  discountExpiredText: { fontSize: 12, color: colors.slate500, flexShrink: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  originalPrice: { fontSize: 12, color: colors.slate400, textDecorationLine: 'line-through' },
  finalPrice: { fontSize: 15, fontWeight: '800', color: colors.slate900 },
  savedText: { fontSize: 11, color: colors.emerald, fontWeight: '600' },

  // Detail modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '93%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },

  doctorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.tealLight, borderRadius: 16, padding: 14, marginBottom: 20,
  },
  doctorIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  doctorCardName: { fontSize: 16, fontWeight: '800', color: colors.slate900 },
  doctorCardSub: { fontSize: 12, color: colors.teal, marginTop: 2 },

  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },
  medDetailRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.slate50, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  medDetailIndex: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center',
  },
  medDetailIndexText: { fontSize: 11, fontWeight: '800', color: colors.teal },
  medDetailName: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  medDetailSub: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  instructionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  instructionText: { flex: 1, fontSize: 11, color: colors.slate500, lineHeight: 16 },

  pricingBox: { backgroundColor: colors.slate50, borderRadius: 14, padding: 14 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pricingLabel: { fontSize: 13, color: colors.slate500 },
  pricingValue: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  pricingTotalRow: {
    borderTopWidth: 1, borderTopColor: colors.slate200,
    paddingTop: 10, marginBottom: 0, marginTop: 4,
  },
  pricingTotalLabel: { fontSize: 15, fontWeight: '800', color: colors.slate900 },
  pricingTotalValue: { fontSize: 18, fontWeight: '900', color: colors.teal },

  codeCardGrad: { borderRadius: 18, padding: 20, marginBottom: 12, gap: 6 },
  codeCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  codeCardCode: { fontSize: 26, fontWeight: '900', color: colors.white, letterSpacing: 2 },
  codeCardExpiry: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.white, borderRadius: 12, paddingVertical: 10, marginTop: 8,
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },

  codeExpiredCard: {
    alignItems: 'center', gap: 8,
    backgroundColor: colors.slate100, borderRadius: 16, padding: 20, marginBottom: 12,
  },
  codeExpiredText: { fontSize: 13, color: colors.slate500, textAlign: 'center' },

  pharmacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.slate50, borderRadius: 12, padding: 12,
  },
  pharmacyNoteText: { flex: 1, fontSize: 12, color: colors.slate600, lineHeight: 18 },
});
