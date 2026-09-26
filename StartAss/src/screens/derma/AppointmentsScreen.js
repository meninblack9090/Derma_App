import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { igaLabels } from '../../data/constants';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToAppointments,
  updateConsultationStatus,
  rejectConsultation,
  getOrCreateConversation,
} from '../../firebase/firestore';

const statusTabs = ['All', 'Upcoming', 'Completed', 'Rejected'];

export default function AppointmentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [dermaAppointments, setDermaAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAppointments(user.uid, setDermaAppointments);
    return unsub;
  }, [user]);

  const filtered = dermaAppointments.filter((a) => {
    if (activeTab === 'All') return true;
    return a.status === activeTab.toLowerCase();
  });

  const handleStatusUpdate = async (apptId, newStatus) => {
    try {
      await updateConsultationStatus(apptId, newStatus);
      setSelectedAppt(null);
    } catch {}
  };

  const openRejectModal = (appt) => {
    setRejectTarget(appt);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for rejecting this appointment.');
      return;
    }
    try {
      await rejectConsultation(rejectTarget.id, rejectReason.trim());
      setShowRejectModal(false);
      setSelectedAppt(null);
      Alert.alert('Rejected', 'The appointment has been rejected. The patient will see your reason.');
    } catch {
      Alert.alert('Error', 'Could not reject. Please try again.');
    }
  };

  const handleMessage = async (appt) => {
    if (!user) return;
    try {
      const convId = await getOrCreateConversation(
        appt.patientId,
        user.uid,
        appt.patientName,
        profile?.displayName ?? 'Doctor',
      );
      setSelectedAppt(null);
      navigation.navigate('Messages', {
        directChat: { id: convId, patientId: appt.patientId, patientName: appt.patientName },
        _ts: Date.now(),
      });
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  const statusColor = (status) => {
    if (status === 'upcoming') return { color: colors.teal, bg: colors.tealLight };
    if (status === 'rejected') return { color: colors.red, bg: '#fff5f5' };
    if (status === 'completed') return { color: colors.emerald, bg: '#ecfdf5' };
    return { color: colors.slate500, bg: colors.slate100 };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{dermaAppointments.length} total</Text>
        </View>
      </View>

      {/* Status tabs */}
      <View style={styles.tabsRow}>
        {statusTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, activeTab === t && styles.tabChipActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabChipText, activeTab === t && styles.tabChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Today', value: dermaAppointments.filter(a => a.status !== 'completed').length, color: colors.teal },
            { label: 'Pending', value: dermaAppointments.filter(a => a.status === 'pending').length, color: colors.amber },
            { label: 'Done', value: dermaAppointments.filter(a => a.status === 'completed').length, color: colors.emerald },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Appointment list */}
        <View style={styles.apptList}>
          {filtered.map((appt) => {
            const sc = statusColor(appt.status);
            const iga = igaLabels[appt.igaGrade] || igaLabels[2];
            return (
              <TouchableOpacity
                key={appt.id}
                style={styles.apptCard}
                onPress={() => setSelectedAppt(appt)}
              >
                <View style={styles.apptLeft}>
                  <View style={styles.timeCol}>
                    <Text style={styles.apptTime}>{appt.time}</Text>
                    <Text style={styles.apptDate} numberOfLines={1}>{appt.date.split(',')[0]}</Text>
                  </View>
                  <View style={styles.dividerLine} />
                  <ProfileAvatar gender={appt.patientGender} role="patient" size={40} seed={appt.patientName || appt.patientId} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.apptPatient} numberOfLines={1}>{appt.patientName}</Text>
                    <Text style={styles.apptIssue} numberOfLines={1}>{appt.issue}</Text>
                    <View style={styles.apptMetaRow}>
                      <Ionicons name="calendar-outline" size={11} color={colors.slate400} />
                      <Text style={styles.apptMetaText} numberOfLines={1}>{appt.date}</Text>
                      <View style={[styles.igaChip, { backgroundColor: iga.bg }]}>
                        <Text style={[styles.igaChipText, { color: iga.color }]}>IGA {appt.igaGrade}</Text>
                      </View>
                    </View>
                    {appt.status === 'rejected' && appt.rejectionReason ? (
                      <Text style={styles.rejectionHint} numberOfLines={1}>Rejected: {appt.rejectionReason}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg, flexShrink: 0, marginLeft: 6 }]}>
                  <Text style={[styles.statusText, { color: sc.color }]}>{appt.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.slate300} />
            <Text style={styles.emptyTitle}>No appointments</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!selectedAppt} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            {selectedAppt && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Appointment Details</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedAppt(null)}>
                    <Ionicons name="close" size={18} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <LinearGradient
                  colors={[colors.teal, colors.tealDark]}
                  style={styles.modalHero}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-outline" size={22} color={colors.white} />
                  </View>
                  <View>
                    <Text style={styles.modalHeroName}>{selectedAppt.patientName}</Text>
                    <Text style={styles.modalHeroIssue}>{selectedAppt.issue}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.modalGrid}>
                  {[
                    { label: 'Date', value: selectedAppt.date, icon: 'calendar-outline' },
                    { label: 'Time', value: selectedAppt.time, icon: 'time-outline' },
                    { label: 'Issue', value: selectedAppt.issue, icon: 'medical-outline' },
                    { label: 'IGA Grade', value: 'Grade ' + selectedAppt.igaGrade, icon: 'analytics-outline' },
                  ].map((d) => (
                    <View key={d.label} style={styles.modalGridItem}>
                      <View style={styles.modalGridIcon}>
                        <Ionicons name={d.icon} size={14} color={colors.teal} />
                      </View>
                      <View>
                        <Text style={styles.modalGridLabel}>{d.label}</Text>
                        <Text style={styles.modalGridValue}>{d.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {selectedAppt.status === 'rejected' && selectedAppt.rejectionReason ? (
                  <View style={styles.rejectionBox}>
                    <Ionicons name="alert-circle" size={16} color={colors.red} />
                    <Text style={styles.rejectionBoxText}>{selectedAppt.rejectionReason}</Text>
                  </View>
                ) : null}

                {/* Message button — always visible */}
                <TouchableOpacity style={styles.messageBtn} onPress={() => handleMessage(selectedAppt)}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.teal} />
                  <Text style={styles.messageBtnText}>Message Patient</Text>
                </TouchableOpacity>

                {selectedAppt.status === 'upcoming' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleStatusUpdate(selectedAppt.id, 'completed')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                      <Text style={styles.acceptBtnText}>Mark as Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => openRejectModal(selectedAppt)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.red} />
                      <Text style={styles.rejectBtnText}>Reject Booking</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject reason modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.rejectOverlay}>
          <View style={styles.rejectSheet}>
            <Text style={styles.rejectTitle}>Reject Appointment</Text>
            <Text style={styles.rejectSub}>
              {rejectTarget?.patientName ?? 'Patient'} — {rejectTarget?.date} at {rejectTarget?.time}
            </Text>
            <Text style={styles.rejectLabel}>Reason for rejection</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Fully booked on this date, please reschedule..."
              placeholderTextColor={colors.slate300}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.rejectConfirmBtn, !rejectReason.trim() && { opacity: 0.5 }]}
              onPress={handleReject}
              disabled={!rejectReason.trim()}
            >
              <Text style={styles.rejectConfirmText}>Submit Rejection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectCancelBtn}
              onPress={() => setShowRejectModal(false)}
            >
              <Text style={styles.rejectCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  countBadge: { backgroundColor: colors.tealLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700', color: colors.teal },

  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100,
  },
  tabChip: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.slate50,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  tabChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabChipText: { fontSize: 13, fontWeight: '700', color: colors.slate600, textAlign: 'center' },
  tabChipTextActive: { color: colors.white },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: colors.slate400, fontWeight: '600', marginTop: 2 },

  apptList: { gap: 10 },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  apptLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden' },
  timeCol: { alignItems: 'center', width: 48, flexShrink: 0 },
  apptTime: { fontSize: 11, fontWeight: '700', color: colors.teal },
  apptDate: { fontSize: 9, color: colors.slate400, marginTop: 2, textAlign: 'center' },
  dividerLine: { width: 1, height: 40, backgroundColor: colors.slate100, flexShrink: 0 },
  apptAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  apptEmoji: { fontSize: 20 },
  apptPatient: { fontSize: 13, fontWeight: '700', color: colors.slate800, flexShrink: 1 },
  apptIssue: { fontSize: 11, color: colors.slate500, marginTop: 1, flexShrink: 1 },
  apptMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  apptMetaText: { fontSize: 10, color: colors.slate400, flexShrink: 1 },
  igaChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, marginLeft: 2 },
  igaChipText: { fontSize: 9, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate500 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  modalHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  modalHeroEmoji: { fontSize: 36 },
  modalHeroName: { fontSize: 17, fontWeight: '800', color: colors.white },
  modalHeroIssue: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  modalGridItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 12,
  },
  modalGridIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  modalGridLabel: { fontSize: 10, color: colors.slate400 },
  modalGridValue: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  rejectionHint: { fontSize: 10, color: colors.red, marginTop: 3, fontStyle: 'italic' },

  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fff5f5', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#fecaca',
  },
  rejectionBoxText: { flex: 1, fontSize: 12, color: colors.red, lineHeight: 18 },

  messageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.tealLight, borderRadius: 14, paddingVertical: 13, marginBottom: 10,
  },
  messageBtnText: { fontSize: 14, fontWeight: '600', color: colors.teal },

  modalActions: { gap: 10 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.teal, borderRadius: 14, paddingVertical: 13,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 14, paddingVertical: 13,
    backgroundColor: '#fff5f5',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: colors.red },

  rejectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  rejectSheet: {
    backgroundColor: colors.white, borderRadius: 24, padding: 24,
  },
  rejectTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900, marginBottom: 4 },
  rejectSub: { fontSize: 12, color: colors.slate500, marginBottom: 16 },
  rejectLabel: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 8 },
  rejectInput: {
    backgroundColor: colors.slate50, borderRadius: 14, padding: 14, fontSize: 14,
    color: colors.slate800, borderWidth: 1.5, borderColor: colors.slate200,
    minHeight: 100, marginBottom: 16,
  },
  rejectConfirmBtn: {
    backgroundColor: colors.red, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  rejectConfirmText: { fontSize: 15, fontWeight: '700', color: colors.white },
  rejectCancelBtn: {
    backgroundColor: colors.slate100, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  rejectCancelText: { fontSize: 15, fontWeight: '700', color: colors.slate500 },
});
