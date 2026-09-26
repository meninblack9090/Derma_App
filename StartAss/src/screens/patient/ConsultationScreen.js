import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToConsultations,
  getDermatologists,
  bookConsultation,
  cancelConsultation,
  getOrCreateConversation,
  submitRating,
} from '../../firebase/firestore';

const tabs = ['Upcoming', 'Past', 'Rejected'];

const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

const getNextDays = (count) => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
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
};

export default function ConsultationScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Rating flow states
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);

  // Booking flow states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const nextDays = useMemo(() => getNextDays(14), []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConsultations(user.uid, setConsultations);
    return unsub;
  }, [user]);

  useEffect(() => {
    getDermatologists().then(setAvailableDoctors).catch(() => {});
  }, []);

  const openBooking = (doctor) => {
    setBookingDoctor(doctor);
    setSelectedDate(nextDays[0].key);
    setSelectedTime(null);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!bookingDoctor || !selectedDate || !selectedTime || bookingLoading) return;
    setBookingLoading(true);
    const dayObj = nextDays.find((d) => d.key === selectedDate);
    try {
      await bookConsultation({
        patientId: user.uid,
        patientName: profile?.displayName ?? '',
        patientGender: profile?.gender ?? 'male',
        dermaId: bookingDoctor.id,
        dermaName: bookingDoctor.displayName ?? '',
        dermaSpecialty: bookingDoctor.specialty ?? 'Dermatologist',
        dermaGender: bookingDoctor.gender ?? 'male',
        date: dayObj?.full ?? selectedDate,
        time: selectedTime,
        type: 'In-Person',
        issue: 'Acne Consultation',
        igaGrade: 2,
      });
      setShowBookingModal(false);
      Alert.alert('Booked!', `Consultation with Dr. ${bookingDoctor.displayName ?? 'Doctor'} on ${dayObj?.full} at ${selectedTime}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = (appt) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment with ${appt.dermaName} on ${appt.date}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await cancelConsultation(appt.id);
              setSelectedAppt(null);
              Alert.alert('Cancelled', 'Your appointment has been cancelled.');
            } catch {
              Alert.alert('Error', 'Could not cancel. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openRating = (appt) => {
    setRatingTarget(appt);
    setRatingValue(0);
    setRatingComment('');
    setRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (!ratingTarget || ratingValue === 0 || ratingBusy) return;
    setRatingBusy(true);
    try {
      await submitRating(
        ratingTarget.id,
        user.uid,
        profile?.displayName ?? '',
        ratingTarget.dermaId,
        ratingValue,
        ratingComment.trim(),
      );
      setRatingModal(false);
      Alert.alert('Thank you!', 'Your rating has been submitted.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRatingBusy(false);
    }
  };

  const handleMessage = async (appt) => {
    if (!user) return;
    try {
      const convId = await getOrCreateConversation(
        user.uid,
        appt.dermaId,
        profile?.displayName ?? '',
        appt.dermaName,
      );
      navigation.navigate('Messages', {
        directChat: { id: convId, dermaId: appt.dermaId, dermaName: appt.dermaName },
        _ts: Date.now(),
      });
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  const filtered = consultations.filter((c) => {
    if (activeTab === 0) return c.status === 'upcoming';
    if (activeTab === 1) return c.status === 'completed';
    return c.status === 'rejected';
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consultations</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {tabs.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Appointments */}
        {filtered.length > 0 ? (
          <View style={styles.apptList}>
            {filtered.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.apptCard}
                onPress={() => setSelectedAppt(c)}
              >
                <View style={styles.apptTop}>
                  <ProfileAvatar gender={c.dermaGender} role="derma" size={44} seed={c.dermaId || c.dermaName} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.apptDoctor} numberOfLines={1}>{c.dermaName}</Text>
                    <Text style={styles.apptSpecialty}>{c.dermaSpecialty ?? 'Dermatologist'}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: c.status === 'upcoming' ? colors.tealLight : c.status === 'rejected' ? '#fff5f5' : colors.slate100 },
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: c.status === 'upcoming' ? colors.teal : c.status === 'rejected' ? colors.red : colors.slate500 },
                    ]}>
                      {c.status === 'upcoming' ? 'Upcoming' : c.status === 'rejected' ? 'Rejected' : 'Done'}
                    </Text>
                  </View>
                </View>

                <View style={styles.apptIssueRow}>
                  <Ionicons name="medical-outline" size={12} color={colors.slate400} />
                  <Text style={styles.apptIssue}>{c.issue}</Text>
                </View>

                <View style={styles.apptMeta}>
                  <View style={styles.apptMetaItem}>
                    <Ionicons name="calendar-outline" size={13} color={colors.teal} />
                    <Text style={styles.apptMetaText}>{c.date}</Text>
                  </View>
                  <View style={styles.apptMetaItem}>
                    <Ionicons name="time-outline" size={13} color={colors.teal} />
                    <Text style={styles.apptMetaText}>{c.time}</Text>
                  </View>
                </View>

                {c.status === 'rejected' && c.rejectionReason ? (
                  <View style={styles.rejectionBox}>
                    <Ionicons name="alert-circle" size={14} color={colors.red} />
                    <Text style={styles.rejectionText} numberOfLines={2}>{c.rejectionReason}</Text>
                  </View>
                ) : null}

                <View style={styles.apptActions}>
                  <TouchableOpacity
                    style={styles.msgSmallBtn}
                    onPress={() => handleMessage(c)}
                  >
                    <Ionicons name="chatbubble-outline" size={13} color={colors.teal} />
                    <Text style={styles.msgSmallText}>Message</Text>
                  </TouchableOpacity>
                  {c.status === 'upcoming' && (
                    <TouchableOpacity
                      style={styles.cancelSmallBtn}
                      onPress={() => handleCancel(c)}
                    >
                      <Ionicons name="close-circle-outline" size={13} color={colors.red} />
                      <Text style={styles.cancelSmallText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  {c.status === 'completed' && !c.rated && (
                    <TouchableOpacity
                      style={styles.rateSmallBtn}
                      onPress={() => openRating(c)}
                    >
                      <Ionicons name="star-outline" size={13} color="#f59e0b" />
                      <Text style={styles.rateSmallText}>Rate</Text>
                    </TouchableOpacity>
                  )}
                  {c.status === 'completed' && c.rated && (
                    <View style={styles.ratedBadge}>
                      <Ionicons name="star" size={13} color="#f59e0b" />
                      <Text style={styles.ratedText}>Rated {c.rating}/5</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.slate300} />
            <Text style={styles.emptyTitle}>No {tabs[activeTab]} Appointments</Text>
            <Text style={styles.emptySub}>Book a consultation with a dermatologist</Text>
          </View>
        )}

        {/* Available Doctors */}
        <Text style={styles.sectionTitle}>Available Dermatologists</Text>
        <View style={styles.doctorsList}>
          {availableDoctors.map((doc) => (
            <View key={doc.id} style={styles.doctorCard}>
              <View style={styles.doctorLeft}>
                <ProfileAvatar gender={doc.gender} role="derma" size={44} seed={doc.id || doc.displayName} />
                <View>
                  <Text style={styles.doctorName}>{doc.displayName ?? doc.name ?? 'Dr. —'}</Text>
                  <Text style={styles.doctorSpecialty}>{doc.specialty ?? 'Dermatologist'}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={styles.ratingText}>{doc.rating ?? '—'} · {doc.reviews ?? 0} reviews</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => openBooking(doc)}
              >
                <Text style={styles.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Appointment detail modal */}
      <Modal visible={!!selectedAppt} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selectedAppt && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Appointment Details</Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setSelectedAppt(null)}
                  >
                    <Ionicons name="close" size={18} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalDocCard, { backgroundColor: colors.tealLight }]}>
                  <ProfileAvatar gender={selectedAppt.dermaGender} role="derma" size={44} seed={selectedAppt.dermaId || selectedAppt.dermaName} />
                  <View>
                    <Text style={styles.modalDocName}>{selectedAppt.dermaName}</Text>
                    <Text style={styles.modalDocSpec}>{selectedAppt.dermaSpecialty}</Text>
                  </View>
                </View>

                <View style={styles.modalGrid}>
                  {[
                    { label: 'Date', value: selectedAppt.date, icon: 'calendar-outline' },
                    { label: 'Time', value: selectedAppt.time, icon: 'time-outline' },
                    { label: 'Issue', value: selectedAppt.issue, icon: 'medical-outline' },
                  ].map((d) => (
                    <View key={d.label} style={styles.modalGridItem}>
                      <Ionicons name={d.icon} size={14} color={colors.teal} />
                      <View>
                        <Text style={styles.modalGridLabel}>{d.label}</Text>
                        <Text style={styles.modalGridValue}>{d.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {selectedAppt.status === 'upcoming' && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setSelectedAppt(null); handleCancel(selectedAppt); }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.red} />
                    <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Booking modal — date & time picker */}
      <Modal visible={showBookingModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bookingOverlay}
          activeOpacity={1}
          onPress={() => setShowBookingModal(false)}
        />
        <View style={styles.bookingSheet}>
          <View style={styles.bookingHandle} />
          {bookingDoctor && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.bookingTitle}>Book with Dr. {bookingDoctor.displayName ?? 'Doctor'}</Text>
              <Text style={styles.bookingSpec}>{bookingDoctor.specialty ?? 'Dermatologist'}</Text>

              {/* Date picker */}
              <Text style={styles.pickerLabel}>Select Date</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateScroll}
                contentContainerStyle={styles.dateScrollContent}
              >
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

              {/* Time picker */}
              <Text style={[styles.pickerLabel, { marginTop: 16 }]}>Select Time</Text>
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

              {/* Confirm */}
              <TouchableOpacity
                style={[styles.confirmBtn, (!selectedDate || !selectedTime) && { opacity: 0.5 }]}
                onPress={handleConfirmBooking}
                disabled={!selectedDate || !selectedTime || bookingLoading}
              >
                <Text style={styles.confirmBtnText}>
                  {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
      {/* Rating modal */}
      <Modal visible={ratingModal} transparent animationType="fade">
        <View style={styles.rateOverlay}>
          <View style={styles.rateSheet}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateTitle}>Rate your experience</Text>
              <TouchableOpacity style={styles.rateCloseBtn} onPress={() => setRatingModal(false)}>
                <Ionicons name="close" size={18} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            {ratingTarget && (
              <Text style={styles.rateDocName}>Dr. {ratingTarget.dermaName}</Text>
            )}

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                  <Ionicons
                    name={star <= ratingValue ? 'star' : 'star-outline'}
                    size={36}
                    color="#f59e0b"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.starsLabel}>
              {ratingValue === 0 ? 'Tap a star to rate' : ratingValue <= 2 ? 'Could be better' : ratingValue <= 3 ? 'Good' : ratingValue <= 4 ? 'Very good' : 'Excellent!'}
            </Text>

            <TextInput
              style={styles.rateInput}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Leave a comment (optional)"
              placeholderTextColor={colors.slate300}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.rateSubmitBtn, ratingValue === 0 && { opacity: 0.5 }]}
              onPress={handleSubmitRating}
              disabled={ratingValue === 0 || ratingBusy}
            >
              <Ionicons name="star" size={16} color={colors.white} />
              <Text style={styles.rateSubmitText}>{ratingBusy ? 'Submitting...' : 'Submit Rating'}</Text>
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
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.slate500 },
  tabTextActive: { color: colors.slate900 },

  apptList: { gap: 12, marginBottom: 24 },
  apptCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  apptTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  apptAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  apptEmoji: { fontSize: 24 },
  apptDoctor: { fontSize: 15, fontWeight: '700', color: colors.slate900, flexShrink: 1 },
  apptSpecialty: { fontSize: 11, color: colors.slate500, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },

  apptIssueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  apptIssue: { fontSize: 12, color: colors.slate600, flexShrink: 1 },

  apptMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  apptMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apptMetaText: { fontSize: 12, color: colors.slate600, fontWeight: '500' },

  apptActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  msgSmallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: colors.tealLight,
  },
  msgSmallText: { fontSize: 12, fontWeight: '600', color: colors.teal },
  cancelSmallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.red, backgroundColor: '#fff5f5',
  },
  cancelSmallText: { fontSize: 12, fontWeight: '600', color: colors.red },
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#fff5f5', borderRadius: 10, padding: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#fecaca',
  },
  rejectionText: { flex: 1, fontSize: 11, color: colors.red, lineHeight: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8, marginBottom: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate600 },
  emptySub: { fontSize: 13, color: colors.slate400 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 12 },

  doctorsList: { gap: 10 },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  doctorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doctorAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doctorEmoji: { fontSize: 24 },
  doctorName: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  doctorSpecialty: { fontSize: 11, color: colors.slate500, marginTop: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 11, color: colors.slate500 },
  bookBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bookBtnDisabled: { backgroundColor: colors.slate200 },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  bookBtnTextDisabled: { color: colors.slate400 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  modalClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },

  modalDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  modalAvatarWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalDocName: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  modalDocSpec: { fontSize: 12, color: colors.slate500, marginTop: 2 },

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
  modalGridLabel: { fontSize: 10, color: colors.slate400 },
  modalGridValue: { fontSize: 12, fontWeight: '600', color: colors.slate700 },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: '#fff5f5',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.red },

  bookingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bookingSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '85%',
  },
  bookingHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.slate200,
    alignSelf: 'center', marginBottom: 16,
  },
  bookingTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900, marginBottom: 2 },
  bookingSpec: { fontSize: 13, color: colors.slate500, marginBottom: 18 },

  pickerLabel: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },

  dateScroll: {
    minHeight: 70,
    marginBottom: 16,
    flexGrow: 0,
  },
  dateScrollContent: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.slate50,
    borderWidth: 1.5,
    borderColor: colors.slate100,
    marginRight: 8,
    minWidth: 60,
    minHeight: 58,
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  dateChipDay: { fontSize: 10, fontWeight: '700', color: colors.slate400, marginBottom: 2 },
  dateChipDayActive: { color: 'rgba(255,255,255,0.7)' },
  dateChipLabel: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  dateChipLabelActive: { color: colors.white },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.slate50,
    borderWidth: 1.5,
    borderColor: colors.slate100,
  },
  timeChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  timeChipText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  timeChipTextActive: { color: colors.white },

  confirmBtn: {
    backgroundColor: colors.teal,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // Rating
  rateSmallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
  },
  rateSmallText: { fontSize: 12, fontWeight: '600', color: '#f59e0b' },
  ratedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: '#fffbeb',
  },
  ratedText: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },

  rateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  rateSheet: { backgroundColor: colors.white, borderRadius: 24, padding: 24 },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rateTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  rateCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  rateDocName: { fontSize: 14, color: colors.slate500, marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  starsLabel: { textAlign: 'center', fontSize: 13, color: colors.slate400, marginBottom: 16 },
  rateInput: {
    backgroundColor: colors.slate50, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.slate200, padding: 14, fontSize: 14,
    color: colors.slate800, minHeight: 80, marginBottom: 16,
  },
  rateSubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f59e0b', borderRadius: 14, paddingVertical: 14,
  },
  rateSubmitText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
