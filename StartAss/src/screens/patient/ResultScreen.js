import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { igaLabels } from '../../data/constants';
import { useAuth } from '../../context/AuthContext';
import {
  getSkinReport,
  requestValidation,
  getDermatologists,
  bookConsultation,
} from '../../firebase/firestore';

export default function ResultScreen({ navigation, route }) {
  const { user, profile } = useAuth();
  const { reportId, report: passedReport } = route?.params ?? {};
  const [report, setReport] = useState(passedReport ?? null);
  const [loading, setLoading] = useState(!passedReport && !!reportId);
  const [doctors, setDoctors] = useState([]);
  const [showDermaModal, setShowDermaModal] = useState(false);
  const [modalMode, setModalMode] = useState('book'); // 'book' or 'validate'
  const [actionLoading, setActionLoading] = useState(false);

  // Booking date/time step
  const [bookingStep, setBookingStep] = useState('doctor'); // 'doctor' or 'datetime'
  const [pickedDoctor, setPickedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const nextDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        key: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }
    return days;
  }, []);
  const TIME_SLOTS = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  ];

  useEffect(() => {
    if (!passedReport && reportId) {
      getSkinReport(reportId)
        .then(setReport)
        .catch(() => setReport(null))
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  useEffect(() => {
    getDermatologists().then(setDoctors).catch(() => {});
  }, []);

  const openDermaList = (mode) => {
    setModalMode(mode);
    setBookingStep('doctor');
    setPickedDoctor(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setShowDermaModal(true);
  };

  const handleSelectDoctor = async (doctor) => {
    if (modalMode === 'validate') {
      if (actionLoading) return;
      setActionLoading(true);
      try {
        if (report?.id) await requestValidation(report.id, doctor.id);
        setShowDermaModal(false);
        Alert.alert('Submitted', `Validation request sent to Dr. ${doctor.displayName ?? 'Doctor'}.`);
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setActionLoading(false);
      }
    } else {
      setPickedDoctor(doctor);
      setSelectedDate(nextDays[0].key);
      setSelectedTime(null);
      setBookingStep('datetime');
    }
  };

  const handleConfirmBooking = async () => {
    if (!pickedDoctor || !selectedDate || !selectedTime || actionLoading) return;
    setActionLoading(true);
    const dayObj = nextDays.find((d) => d.key === selectedDate);
    try {
      await bookConsultation({
        patientId: user.uid,
        patientName: profile?.displayName ?? '',
        dermaId: pickedDoctor.id,
        dermaName: pickedDoctor.displayName ?? '',
        dermaSpecialty: pickedDoctor.specialty ?? 'Dermatologist',
        date: dayObj?.full ?? selectedDate,
        time: selectedTime,
        type: 'In-Person',
        issue: report?.acneType ?? 'Acne Consultation',
        igaGrade: report?.igaScore ?? 2,
      });
      setShowDermaModal(false);
      Alert.alert('Booked!', `Consultation with Dr. ${pickedDoctor.displayName ?? 'Doctor'} on ${dayObj?.full} at ${selectedTime}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.slate400, marginTop: 12 }}>Loading result...</Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Ionicons name="scan-outline" size={56} color={colors.slate300} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.slate500, marginTop: 16 }}>
          No result available
        </Text>
        <Text style={{ fontSize: 13, color: colors.slate400, marginTop: 8, textAlign: 'center' }}>
          Complete a skin scan or upload a photo to see your AI analysis here.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.white, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const iga = igaLabels[report.igaScore] ?? igaLabels[2];

  const igaEmoji = report.igaScore >= 4 ? '🔴' : report.igaScore >= 3 ? '🟠' : report.igaScore >= 2 ? '🔵' : '🟢';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.slate700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color={colors.slate700} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Uploaded Image */}
        {report.imageUrl ? (
          <Image
            source={{ uri: report.imageUrl }}
            style={styles.scanImage}
            resizeMode="cover"
          />
        ) : null}

        {/* IGA Grade Card */}
        <View style={[styles.igaCard, { backgroundColor: iga.bg }]}>
          <View style={styles.igaCardLeft}>
            <Text style={[styles.igaCardLabel, { color: iga.color }]}>AI Diagnosis</Text>
            <Text style={styles.igaCardGrade}>
              IGA Grade {report.igaScore} — {iga.label}
            </Text>
            <Text style={styles.igaCardType}>{report.acneType}</Text>
          </View>
          <Text style={styles.igaEmoji}>{igaEmoji}</Text>
        </View>

        {/* Skin Score */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCardHeader}>
            <Text style={styles.scoreCardTitle}>Skin Health Score</Text>
            <Text style={[styles.scoreCardValue, {
              color: report.skinScore >= 70 ? colors.emerald : report.skinScore >= 50 ? colors.amber : colors.red,
            }]}>
              {report.skinScore}/100
            </Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View style={[
              styles.scoreBarFill,
              {
                width: `${report.skinScore}%`,
                backgroundColor: report.skinScore >= 70 ? colors.emerald : report.skinScore >= 50 ? colors.amber : colors.red,
              },
            ]} />
          </View>
          <View style={styles.scoreLabels}>
            <Text style={styles.scoreLabelText}>Poor</Text>
            <Text style={styles.scoreLabelText}>Fair</Text>
            <Text style={styles.scoreLabelText}>Good</Text>
          </View>
        </View>

        {/* Details Grid */}
        <Text style={styles.sectionTitle}>Scan Details</Text>
        <View style={styles.detailsGrid}>
          {[
            { label: 'Lesion Count', value: `${report.lesionCount} lesions`, icon: 'analytics-outline' },
            { label: 'AI Confidence', value: `${report.confidence}%`, icon: 'shield-checkmark-outline' },
            { label: 'Date', value: report.date, icon: 'calendar-outline' },
            { label: 'Status', value: report.status, icon: 'checkmark-circle-outline', isStatus: true },
          ].map((d) => (
            <View key={d.label} style={styles.detailCard}>
              <View style={styles.detailIconWrap}>
                <Ionicons name={d.icon} size={16} color={colors.primary} />
              </View>
              <Text style={styles.detailLabel}>{d.label}</Text>
              {d.isStatus ? (
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: report.status === 'Validated' ? colors.emeraldLight : colors.amberLight },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: report.status === 'Validated' ? colors.emerald : colors.amber },
                  ]}>
                    {report.status}
                  </Text>
                </View>
              ) : (
                <Text style={styles.detailValue}>{d.value}</Text>
              )}
            </View>
          ))}
        </View>

        {/* AI Recommendation */}
        <View style={styles.recCard}>
          <View style={styles.recHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.recTitle}>AI Recommendation</Text>
          </View>
          <Text style={styles.recText}>{report.recommendation}</Text>
        </View>

        {/* Severity breakdown */}
        <Text style={styles.sectionTitle}>Severity Breakdown</Text>
        <View style={styles.severityCard}>
          {[
            { label: 'Inflammatory', percent: 65, color: colors.red },
            { label: 'Non-inflammatory', percent: 35, color: colors.amber },
          ].map((s) => (
            <View key={s.label} style={styles.severityRow}>
              <View style={styles.severityLeft}>
                <Text style={styles.severityLabel}>{s.label}</Text>
                <View style={styles.severityBarBg}>
                  <View style={[styles.severityBarFill, { width: `${s.percent}%`, backgroundColor: s.color }]} />
                </View>
              </View>
              <Text style={[styles.severityPercent, { color: s.color }]}>{s.percent}%</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => openDermaList('book')}
          >
            <LinearGradient
              colors={[colors.teal, colors.tealDark]}
              style={styles.primaryActionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="people-outline" size={18} color={colors.white} />
              <Text style={styles.primaryActionText}>Book Consultation</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => openDermaList('validate')}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryActionText}>Request Validation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dermatologist picker / booking modal */}
      <Modal visible={showDermaModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.dermaModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDermaModal(false)}
        />
        <View style={styles.dermaModalSheet}>
          <View style={styles.dermaModalHandle} />

          {bookingStep === 'doctor' ? (
            <>
              <Text style={styles.dermaModalTitle}>
                {modalMode === 'book' ? 'Select a Dermatologist' : 'Send Validation To'}
              </Text>
              <Text style={styles.dermaModalSub}>
                {modalMode === 'book'
                  ? 'Choose a doctor to book a consultation with'
                  : 'Choose a doctor to validate your scan result'}
              </Text>

              {doctors.length === 0 ? (
                <View style={styles.dermaEmpty}>
                  <Ionicons name="people-outline" size={36} color={colors.slate300} />
                  <Text style={styles.dermaEmptyText}>No dermatologists available yet</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                  {doctors.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.dermaCard}
                      onPress={() => handleSelectDoctor(doc)}
                      disabled={actionLoading}
                    >
                      <View style={styles.dermaAvatarWrap}>
                        <Ionicons name="person" size={20} color={colors.teal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dermaName}>Dr. {doc.displayName ?? 'Doctor'}</Text>
                        <Text style={styles.dermaSpec}>{doc.specialty || 'Dermatologist'}</Text>
                      </View>
                      <View style={[
                        styles.dermaSelectBtn,
                        { backgroundColor: modalMode === 'book' ? colors.teal : colors.primary },
                      ]}>
                        <Text style={styles.dermaSelectText}>
                          {modalMode === 'book' ? 'Select' : 'Send'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setBookingStep('doctor')} style={{ marginBottom: 10 }}>
                <Text style={{ color: colors.teal, fontWeight: '600', fontSize: 13 }}>← Back to doctors</Text>
              </TouchableOpacity>
              <Text style={styles.dermaModalTitle}>Pick Date & Time</Text>
              <Text style={styles.dermaModalSub}>Dr. {pickedDoctor?.displayName ?? 'Doctor'}</Text>

              <Text style={styles.pickerLabel}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {nextDays.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dateChip, selectedDate === d.key && styles.dateChipActive]}
                    onPress={() => setSelectedDate(d.key)}
                  >
                    <Text style={[styles.dateChipDay, selectedDate === d.key && styles.dateChipDayActive]}>{d.day}</Text>
                    <Text style={[styles.dateChipLabel, selectedDate === d.key && styles.dateChipLabelActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.pickerLabel}>Time</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, selectedTime === t && styles.timeChipActive]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.timeChipText, selectedTime === t && styles.timeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, (!selectedDate || !selectedTime) && { opacity: 0.5 }]}
                onPress={handleConfirmBooking}
                disabled={!selectedDate || !selectedTime || actionLoading}
              >
                <Text style={styles.confirmBtnText}>{actionLoading ? 'Booking...' : 'Confirm Booking'}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.dermaCancel}
            onPress={() => setShowDermaModal(false)}
          >
            <Text style={styles.dermaCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  scanImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: colors.slate200,
  },

  igaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  igaCardLeft: { flex: 1 },
  igaCardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  igaCardGrade: { fontSize: 20, fontWeight: '800', color: colors.slate900, marginBottom: 4 },
  igaCardType: { fontSize: 13, color: colors.slate600 },
  igaEmoji: { fontSize: 44 },

  scoreCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.slate100,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  scoreCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scoreCardTitle: { fontSize: 14, fontWeight: '700', color: colors.slate700 },
  scoreCardValue: { fontSize: 18, fontWeight: '800' },
  scoreBarBg: { height: 8, borderRadius: 4, backgroundColor: colors.slate100, overflow: 'hidden', marginBottom: 6 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabelText: { fontSize: 10, color: colors.slate400 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 12 },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  detailCard: {
    width: '47%',
    backgroundColor: colors.slate50,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  detailLabel: { fontSize: 10, color: colors.slate400, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },

  recCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  recText: { fontSize: 13, color: colors.slate700, lineHeight: 20 },

  severityCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 12,
    marginBottom: 24,
  },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  severityLeft: { flex: 1, gap: 4 },
  severityLabel: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  severityBarBg: { height: 6, borderRadius: 3, backgroundColor: colors.slate100, overflow: 'hidden' },
  severityBarFill: { height: 6, borderRadius: 3 },
  severityPercent: { fontSize: 13, fontWeight: '800', minWidth: 36, textAlign: 'right' },

  actionsRow: { gap: 10 },
  primaryAction: { borderRadius: 16, overflow: 'hidden' },
  primaryActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  primaryActionText: { fontSize: 15, fontWeight: '700', color: colors.white },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
  },
  secondaryActionText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  dermaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dermaModalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  dermaModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.slate200,
    alignSelf: 'center', marginBottom: 16,
  },
  dermaModalTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900, marginBottom: 4 },
  dermaModalSub: { fontSize: 13, color: colors.slate400, marginBottom: 18 },

  dermaEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  dermaEmptyText: { fontSize: 13, color: colors.slate400 },

  dermaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  dermaAvatarWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.tealLight,
    alignItems: 'center', justifyContent: 'center',
  },
  dermaName: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  dermaSpec: { fontSize: 11, color: colors.slate500, marginTop: 1 },
  dermaClinic: { fontSize: 10, color: colors.slate400, marginTop: 1 },
  dermaSelectBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12,
  },
  dermaSelectText: { fontSize: 12, fontWeight: '700', color: colors.white },

  dermaCancel: {
    alignItems: 'center', paddingVertical: 14, marginTop: 10,
    backgroundColor: colors.slate100, borderRadius: 14,
  },
  dermaCancelText: { fontSize: 15, fontWeight: '700', color: colors.slate500 },

  pickerLabel: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },
  dateChip: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: colors.slate50,
    borderWidth: 1.5, borderColor: colors.slate100, marginRight: 8, minWidth: 60,
  },
  dateChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  dateChipDay: { fontSize: 10, fontWeight: '700', color: colors.slate400, marginBottom: 2 },
  dateChipDayActive: { color: 'rgba(255,255,255,0.7)' },
  dateChipLabel: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  dateChipLabelActive: { color: colors.white },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.slate50, borderWidth: 1.5, borderColor: colors.slate100,
  },
  timeChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  timeChipText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  timeChipTextActive: { color: colors.white },

  confirmBtn: { backgroundColor: colors.teal, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
