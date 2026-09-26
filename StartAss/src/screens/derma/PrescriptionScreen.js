import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getDermatologists } from '../../firebase/firestore';
import {
  sendPrescription,
  subscribeToDermaPrescriptions,
} from '../../firebase/prescriptions';
import { db } from '../../firebase/config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor = (s) => {
  if (s === 'used') return { color: colors.emerald, bg: '#ecfdf5' };
  if (s === 'expired') return { color: colors.slate400, bg: colors.slate100 };
  return { color: colors.teal, bg: colors.tealLight }; // sent / verified
};

const formatPrice = (n) =>
  n !== undefined && n !== null ? `₱${Number(n).toFixed(2)}` : '—';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DermaPrescriptionScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', instructions: '' }]);
  const [originalPrice, setOriginalPrice] = useState('');
  const [sending, setSending] = useState(false);

  // Detail modal
  const [selectedRx, setSelectedRx] = useState(null);

  // ── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDermaPrescriptions(user.uid, setPrescriptions);
    return unsub;
  }, [user]);

  useEffect(() => {
    // Load all patients who have consulted this derma
    db.collection('consultations')
      .where('dermaId', '==', user?.uid)
      .get()
      .then((snap) => {
        const seen = new Set();
        const list = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          if (!seen.has(data.patientId)) {
            seen.add(data.patientId);
            list.push({ id: data.patientId, name: data.patientName });
          }
        });
        setPatients(list);
      })
      .catch(() => {});
  }, [user]);

  // ── Compose logic ────────────────────────────────────────────────────────────

  const addMed = () =>
    setMedications((prev) => [...prev, { name: '', dosage: '', instructions: '' }]);

  const removeMed = (idx) =>
    setMedications((prev) => prev.filter((_, i) => i !== idx));

  const updateMed = (idx, field, value) =>
    setMedications((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );

  const resetCompose = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setMedications([{ name: '', dosage: '', instructions: '' }]);
    setOriginalPrice('');
  };

  const handleSend = async () => {
    if (!selectedPatient) return Alert.alert('Select Patient', 'Please choose a patient.');
    if (!originalPrice || isNaN(Number(originalPrice))) {
      return Alert.alert('Price Required', 'Please enter a valid total price.');
    }
    const validMeds = medications.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      return Alert.alert('Add Medications', 'Please add at least one medication.');
    }

    setSending(true);
    try {
      const rx = await sendPrescription(
        user.uid,
        profile?.displayName ?? 'Doctor',
        selectedPatient.id,
        selectedPatient.name,
        validMeds,
        Number(originalPrice),
      );

      setShowCompose(false);
      resetCompose();
      Alert.alert(
        'Prescription Sent ✅',
        rx.has_discount
          ? `Sent to ${selectedPatient.name} with 💎 50% Premium discount!\nDiscount code: ${rx.discount_code}`
          : `Prescription sent to ${selectedPatient.name}.`,
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  };

  // ── Filtered patients for search ─────────────────────────────────────────────

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <Text style={styles.headerSub}>{prescriptions.length} total sent</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCompose(true)}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {prescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={52} color={colors.slate300} />
            <Text style={styles.emptyTitle}>No prescriptions yet</Text>
            <Text style={styles.emptySub}>Tap "New" to send your first prescription</Text>
          </View>
        ) : (
          prescriptions.map((rx) => {
            const sc = statusColor(rx.status);
            return (
              <TouchableOpacity
                key={rx.id}
                style={styles.rxCard}
                onPress={() => setSelectedRx(rx)}
              >
                <View style={styles.rxCardTop}>
                  <ProfileAvatar gender={undefined} role="patient" size={40} seed={rx.patient_id || rx.patient_name} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rxPatient} numberOfLines={1}>{rx.patient_name}</Text>
                    <Text style={styles.rxMeds} numberOfLines={1}>
                      {rx.medications?.map((m) => m.name).filter(Boolean).join(', ') || '—'}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{rx.status}</Text>
                  </View>
                </View>

                <View style={styles.rxPricingRow}>
                  {rx.has_discount ? (
                    <>
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>💎 50% OFF</Text>
                      </View>
                      <Text style={styles.originalPrice}>{formatPrice(rx.original_price)}</Text>
                      <Text style={styles.finalPrice}>{formatPrice(rx.final_price)}</Text>
                    </>
                  ) : (
                    <Text style={styles.finalPrice}>{formatPrice(rx.original_price)}</Text>
                  )}
                  {rx.discount_code ? (
                    <View style={styles.codeChip}>
                      <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
                      <Text style={styles.codeText}>{rx.discount_code}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── COMPOSE MODAL ─────────────────────────────────────── */}
      <Modal visible={showCompose} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Prescription</Text>
                <TouchableOpacity onPress={() => { setShowCompose(false); resetCompose(); }}>
                  <Ionicons name="close" size={22} color={colors.slate500} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Patient picker */}
                <Text style={styles.fieldLabel}>Patient</Text>
                {selectedPatient ? (
                  <TouchableOpacity
                    style={styles.selectedPatientRow}
                    onPress={() => setSelectedPatient(null)}
                  >
                    <ProfileAvatar gender={undefined} role="patient" size={36} seed={selectedPatient.id} />
                    <Text style={styles.selectedPatientName}>{selectedPatient.name}</Text>
                    <Ionicons name="close-circle" size={18} color={colors.slate400} />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TextInput
                      style={styles.searchInput}
                      value={patientSearch}
                      onChangeText={setPatientSearch}
                      placeholder="Search patient..."
                      placeholderTextColor={colors.slate300}
                    />
                    <View style={styles.patientList}>
                      {filteredPatients.slice(0, 5).map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.patientRow}
                          onPress={() => { setSelectedPatient(p); setPatientSearch(''); }}
                        >
                          <ProfileAvatar gender={undefined} role="patient" size={32} seed={p.id} />
                          <Text style={styles.patientRowName}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                      {filteredPatients.length === 0 && (
                        <Text style={styles.noPatientText}>No patients found</Text>
                      )}
                    </View>
                  </>
                )}

                {/* Medications */}
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Medications</Text>
                {medications.map((med, idx) => (
                  <View key={idx} style={styles.medCard}>
                    <View style={styles.medCardHeader}>
                      <Text style={styles.medCardTitle}>Medicine {idx + 1}</Text>
                      {medications.length > 1 && (
                        <TouchableOpacity onPress={() => removeMed(idx)}>
                          <Ionicons name="trash-outline" size={16} color={colors.rose} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      style={styles.medInput}
                      value={med.name}
                      onChangeText={(v) => updateMed(idx, 'name', v)}
                      placeholder="Medicine name"
                      placeholderTextColor={colors.slate300}
                    />
                    <TextInput
                      style={styles.medInput}
                      value={med.dosage}
                      onChangeText={(v) => updateMed(idx, 'dosage', v)}
                      placeholder="Dosage (e.g. 500mg)"
                      placeholderTextColor={colors.slate300}
                    />
                    <TextInput
                      style={[styles.medInput, { minHeight: 56 }]}
                      value={med.instructions}
                      onChangeText={(v) => updateMed(idx, 'instructions', v)}
                      placeholder="Instructions (e.g. Take once daily)"
                      placeholderTextColor={colors.slate300}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                ))}

                <TouchableOpacity style={styles.addMedBtn} onPress={addMed}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.teal} />
                  <Text style={styles.addMedText}>Add Another Medicine</Text>
                </TouchableOpacity>

                {/* Total price */}
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Total Price (₱)</Text>
                <TextInput
                  style={styles.searchInput}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  placeholder="e.g. 850"
                  placeholderTextColor={colors.slate300}
                  keyboardType="numeric"
                />

                {/* Premium note */}
                <View style={styles.premiumNote}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.premiumNoteText}>
                    If the patient has an active Premium subscription, a 50% discount code will be automatically applied and sent.
                  </Text>
                </View>

                {/* Send button */}
                <TouchableOpacity
                  style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  <Ionicons name="send" size={18} color={colors.white} />
                  <Text style={styles.sendBtnText}>{sending ? 'Sending...' : 'Send Prescription'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAIL MODAL ─────────────────────────────────────────── */}
      <Modal visible={!!selectedRx} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            {selectedRx && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Prescription Details</Text>
                  <TouchableOpacity onPress={() => setSelectedRx(null)}>
                    <Ionicons name="close" size={22} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Patient */}
                  <View style={styles.detailPatientRow}>
                    <ProfileAvatar gender={undefined} role="patient" size={44} seed={selectedRx.patient_id} />
                    <View>
                      <Text style={styles.detailPatientName}>{selectedRx.patient_name}</Text>
                      <Text style={styles.detailDoctorName}>Dr. {selectedRx.doctor_name}</Text>
                    </View>
                    <View style={[statusColor(selectedRx.status).bg && styles.statusPill, { backgroundColor: statusColor(selectedRx.status).bg, marginLeft: 'auto' }]}>
                      <Text style={[styles.statusText, { color: statusColor(selectedRx.status).color }]}>{selectedRx.status}</Text>
                    </View>
                  </View>

                  {/* Medications */}
                  <Text style={styles.detailSectionTitle}>Medications</Text>
                  {(selectedRx.medications ?? []).map((m, i) => (
                    <View key={i} style={styles.detailMedRow}>
                      <View style={styles.detailMedIcon}>
                        <Ionicons name="medkit-outline" size={14} color={colors.teal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailMedName}>{m.name}</Text>
                        {m.dosage ? <Text style={styles.detailMedSub}>{m.dosage}</Text> : null}
                        {m.instructions ? <Text style={styles.detailMedSub}>{m.instructions}</Text> : null}
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
                      <>
                        <View style={styles.pricingRow}>
                          <Text style={[styles.pricingLabel, { color: colors.primary }]}>💎 Premium Discount (50%)</Text>
                          <Text style={[styles.pricingValue, { color: colors.primary }]}>−{formatPrice(selectedRx.discount_amount)}</Text>
                        </View>
                        <View style={[styles.pricingRow, styles.pricingFinalRow]}>
                          <Text style={styles.pricingFinalLabel}>Final Price</Text>
                          <Text style={styles.pricingFinalValue}>{formatPrice(selectedRx.final_price)}</Text>
                        </View>
                      </>
                    )}
                    {!selectedRx.has_discount && (
                      <View style={[styles.pricingRow, styles.pricingFinalRow]}>
                        <Text style={styles.pricingFinalLabel}>Total</Text>
                        <Text style={styles.pricingFinalValue}>{formatPrice(selectedRx.original_price)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Discount code */}
                  {selectedRx.discount_code && (
                    <LinearGradient
                      colors={['#4f46e5', '#7c3aed']}
                      style={styles.discountCodeCard}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="pricetag" size={22} color="rgba(255,255,255,0.8)" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.discountCodeLabel}>{selectedRx.discount_label}</Text>
                        <Text style={styles.discountCodeValue}>{selectedRx.discount_code}</Text>
                        <Text style={styles.discountCodeSub}>
                          {selectedRx.discount_used ? '✅ Used at pharmacy' : '⏳ Valid for 24hrs — show at pharmacy'}
                        </Text>
                      </View>
                    </LinearGradient>
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
  headerSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate500 },
  emptySub: { fontSize: 13, color: colors.slate400 },

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
  },
  rxCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rxPatient: { fontSize: 14, fontWeight: '700', color: colors.slate800, flexShrink: 1 },
  rxMeds: { fontSize: 11, color: colors.slate500, marginTop: 2, flexShrink: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  rxPricingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  premiumBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  premiumBadgeText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  originalPrice: { fontSize: 12, color: colors.slate400, textDecorationLine: 'line-through' },
  finalPrice: { fontSize: 14, fontWeight: '800', color: colors.slate900 },
  codeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  codeText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  // Modal
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

  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 8 },
  searchInput: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.slate800,
    marginBottom: 8,
  },
  patientList: { marginBottom: 4 },
  patientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate100,
  },
  patientRowName: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  noPatientText: { fontSize: 13, color: colors.slate400, textAlign: 'center', paddingVertical: 12 },

  selectedPatientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.tealLight, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  selectedPatientName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.slate800 },

  medCard: { backgroundColor: colors.slate50, borderRadius: 14, padding: 14, marginBottom: 10 },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medCardTitle: { fontSize: 12, fontWeight: '700', color: colors.slate600 },
  medInput: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate800,
    marginBottom: 8,
  },

  addMedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.teal, borderRadius: 12, paddingVertical: 11,
    marginBottom: 4,
  },
  addMedText: { fontSize: 13, fontWeight: '700', color: colors.teal },

  premiumNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12,
    marginTop: 12, marginBottom: 16,
  },
  premiumNoteText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 18 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.teal, borderRadius: 16, paddingVertical: 15, marginTop: 4,
  },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // Detail modal
  detailPatientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.slate100,
  },
  detailPatientName: { fontSize: 16, fontWeight: '800', color: colors.slate900 },
  detailDoctorName: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },
  detailMedRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.slate50, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  detailMedIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center',
  },
  detailMedName: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  detailMedSub: { fontSize: 11, color: colors.slate500, marginTop: 2 },

  pricingBox: {
    backgroundColor: colors.slate50, borderRadius: 14, padding: 14, marginBottom: 16,
  },
  pricingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  pricingFinalRow: {
    borderTopWidth: 1, borderTopColor: colors.slate200,
    paddingTop: 10, marginBottom: 0, marginTop: 4,
  },
  pricingLabel: { fontSize: 13, color: colors.slate500 },
  pricingValue: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  pricingFinalLabel: { fontSize: 14, fontWeight: '800', color: colors.slate900 },
  pricingFinalValue: { fontSize: 16, fontWeight: '900', color: colors.teal },

  discountCodeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 16, padding: 16,
  },
  discountCodeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  discountCodeValue: { fontSize: 20, fontWeight: '900', color: colors.white, letterSpacing: 1 },
  discountCodeSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
});
