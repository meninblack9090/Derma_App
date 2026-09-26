import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToAppointments,
  subscribeToPendingValidations,
  validateReport,
  rejectReport,
  modifyAndValidateReport,
  getOrCreateConversation,
  subscribeToDermaRatings,
} from '../../firebase/firestore';
import { sendPrescription } from '../../firebase/prescriptions';
import { igaLabels } from '../../data/constants';
import NotificationBell from '../../components/NotificationBell';

export default function DermaDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [dermaAppointments, setDermaAppointments] = useState([]);
  const [pendingValidations, setPendingValidations] = useState([]);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAppointments(user.uid, setDermaAppointments);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPendingValidations(user.uid, setPendingValidations);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDermaRatings(user.uid, setRatings);
    return unsub;
  }, [user]);

  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewStep, setReviewStep] = useState('view'); // 'view' | 'modify' | 'rx'
  const [dermaNote, setDermaNote] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  // Modify fields
  const [modAcneType, setModAcneType] = useState('');
  const [modIga, setModIga] = useState('');
  const [modSkinScore, setModSkinScore] = useState('');
  const [modRec, setModRec] = useState('');

  // Prescription compose (post-validation)
  const [rxMeds, setRxMeds] = useState([{ name: '', dosage: '', instructions: '' }]);
  const [rxPrice, setRxPrice] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayAppts = dermaAppointments.filter((a) => a.status === 'upcoming');

  const openReview = (report) => {
    setSelectedReport(report);
    setDermaNote('');
    setRejectReason('');
    setReviewStep('view');
    setModAcneType(report.acneType ?? '');
    setModIga(String(report.igaScore ?? 2));
    setModSkinScore(String(report.skinScore ?? 50));
    setModRec(report.recommendation ?? '');
    setRxMeds([{ name: '', dosage: '', instructions: '' }]);
    setRxPrice('');
    setReviewModal(true);
  };

  const closeReview = () => {
    setReviewModal(false);
    setSelectedReport(null);
    setReviewStep('view');
  };

  const handleAccept = async () => {
    if (!selectedReport || busy) return;
    setBusy(true);
    try {
      await validateReport(selectedReport.id, user.uid, dermaNote);
      setReviewStep('rx');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleModifyAndAccept = async () => {
    if (!selectedReport || busy) return;
    setBusy(true);
    try {
      await modifyAndValidateReport(
        selectedReport.id,
        user.uid,
        {
          acneType: modAcneType || undefined,
          igaScore: modIga !== '' ? Number(modIga) : undefined,
          skinScore: modSkinScore !== '' ? Number(modSkinScore) : undefined,
          recommendation: modRec || undefined,
        },
        dermaNote,
      );
      setReviewStep('rx');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !rejectReason.trim() || busy) return;
    setBusy(true);
    try {
      await rejectReport(selectedReport.id, user.uid, rejectReason.trim());
      setRejectModal(false);
      closeReview();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSendPrescription = async () => {
    if (!selectedReport || busy) return;
    const validMeds = rxMeds.filter((m) => m.name.trim());
    if (validMeds.length === 0) return Alert.alert('Add Medicine', 'Enter at least one medicine name.');
    if (!rxPrice || isNaN(Number(rxPrice))) return Alert.alert('Price Required', 'Enter a valid price.');
    setBusy(true);
    try {
      const rx = await sendPrescription(
        user.uid,
        profile?.displayName ?? 'Doctor',
        selectedReport.patientId,
        selectedReport.patientName,
        validMeds,
        Number(rxPrice),
      );
      closeReview();
      Alert.alert(
        'Prescription Sent ✅',
        rx.has_discount
          ? `Sent with 💎 50% Premium discount!\nCode: ${rx.discount_code}`
          : `Prescription sent to ${selectedReport.patientName}.`,
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!selectedReport || busy) return;
    setBusy(true);
    try {
      const convId = await getOrCreateConversation(
        selectedReport.patientId,
        user.uid,
        selectedReport.patientName,
        profile?.displayName ?? 'Doctor',
      );
      closeReview();
      navigation.navigate('Messages', {
        directChat: {
          id: convId,
          patientId: selectedReport.patientId,
          patientName: selectedReport.patientName,
        },
        _ts: Date.now(),
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const updateRxMed = (idx, field, val) =>
    setRxMeds((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m)));

  const stats = [
    { label: 'Patients', value: String(profile?.totalPatients ?? 0), icon: 'people-outline', color: colors.primary, bg: colors.primaryLight },
    { label: "Today's Appts", value: String(todayAppts.length), icon: 'calendar-outline', color: colors.teal, bg: colors.tealLight },
    { label: 'Pending', value: String(pendingValidations.length), icon: 'time-outline', color: colors.amber, bg: '#fffbeb' },
    { label: 'Rating', value: profile?.averageRating ? `${profile.averageRating}★` : '—', icon: 'star-outline', color: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.drName}>Dr. {profile?.displayName ?? '—'} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <NotificationBell
              role="derma"
              notifications={[]}
              onPress={(notif) => {
                if (notif.icon === 'chatbubble-outline') navigation.navigate('Messages');
                else if (notif.icon === 'calendar-outline') navigation.navigate('Appointments');
              }}
            />
            <ProfileAvatar gender={profile?.gender} role="derma" size={44} seed={user?.uid} />
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'shield-checkmark-outline', label: 'Validate Scans', count: pendingValidations.length, color: colors.teal, bg: colors.tealLight },
            { icon: 'chatbubbles-outline', label: 'Messages', count: 0, color: colors.primary, bg: colors.primaryLight, nav: 'Messages' },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.quickActionCard} onPress={() => a.nav && navigation.navigate(a.nav)}>
              <View style={[styles.quickActionIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
                {a.count > 0 && (
                  <View style={[styles.quickActionBadge, { backgroundColor: a.color }]}>
                    <Text style={styles.quickActionBadgeText}>{a.count}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickActionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's appointments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.seeAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {todayAppts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={28} color={colors.slate300} />
            <Text style={styles.emptyBoxText}>No appointments today</Text>
          </View>
        ) : (
          <View style={styles.apptList}>
            {todayAppts.slice(0, 3).map((appt) => {
              const statusColor = appt.status === 'upcoming' ? colors.teal : colors.amber;
              const statusBg = appt.status === 'upcoming' ? colors.tealLight : '#fffbeb';
              return (
                <View key={appt.id} style={styles.apptCard}>
                  <View style={styles.apptTimeCol}>
                    <Text style={styles.apptTime}>{appt.time}</Text>
                    <View style={[styles.apptTypeDot, { backgroundColor: colors.teal }]} />
                  </View>
                  <View style={styles.apptContent}>
                    <View style={styles.apptAvatarWrap}>
                      <Ionicons name="person-outline" size={18} color={colors.teal} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.apptPatient} numberOfLines={1}>{appt.patientName}</Text>
                      <Text style={styles.apptIssue} numberOfLines={1}>{appt.issue}</Text>
                      <View style={styles.apptMetaRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.slate400} />
                        <Text style={styles.apptMeta} numberOfLines={1}>{appt.date} {appt.time}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }]}>{appt.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pending validations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Validations</Text>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingValidations.length}</Text>
          </View>
        </View>

        {pendingValidations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.slate300} />
            <Text style={styles.emptyBoxText}>No pending validations</Text>
          </View>
        ) : (
          <View style={styles.validationList}>
            {pendingValidations.map((v) => (
              <TouchableOpacity key={v.id} style={styles.validationCard} onPress={() => openReview(v)}>
                {v.imageUrl ? (
                  <Image source={{ uri: v.imageUrl }} style={styles.validationImage} />
                ) : (
                  <View style={styles.validationImagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color={colors.slate300} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.validationPatient}>{v.patientName}</Text>
                  <Text style={styles.validationCondition}>{v.acneType ?? 'Skin Report'}</Text>
                  <View style={styles.validationMeta}>
                    <Text style={styles.validationTime}>{v.date ?? ''}</Text>
                    <Text style={styles.validationScore}>Score: {v.skinScore ?? '—'}/100</Text>
                  </View>
                </View>
                <View style={styles.validationRight}>
                  <View style={[styles.gradeBadge, { backgroundColor: (igaLabels[v.igaScore] || igaLabels[2]).bg }]}>
                    <Text style={[styles.gradeText, { color: (igaLabels[v.igaScore] || igaLabels[2]).color }]}>IGA {v.igaScore}</Text>
                  </View>
                  <View style={styles.reviewBtn}>
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Reviews */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patient Reviews</Text>
          <View style={styles.ratingOverview}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text style={styles.ratingOverviewText}>
              {profile?.averageRating ?? '—'} ({profile?.totalReviews ?? 0} reviews)
            </Text>
          </View>
        </View>

        {ratings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={28} color={colors.slate300} />
            <Text style={styles.emptyBoxText}>No reviews yet</Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {ratings.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewCardTop}>
                  <ProfileAvatar gender={undefined} role="patient" size={32} seed={r.patientId || r.patientName} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{r.patientName || 'Patient'}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : ''}
                  </Text>
                </View>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* ─── REVIEW MODAL ─── */}
        <Modal visible={reviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {reviewStep === 'rx' ? 'Prescription (Optional)' : reviewStep === 'modify' ? 'Modify AI Findings' : 'Review Report'}
                </Text>
                <TouchableOpacity onPress={closeReview}>
                  <Ionicons name="close" size={22} color={colors.slate500} />
                </TouchableOpacity>
              </View>

              {selectedReport && (
                <ScrollView showsVerticalScrollIndicator={false}>

                  {reviewStep !== 'rx' && (
                    <>
                      {selectedReport.imageUrl ? (
                        <Image source={{ uri: selectedReport.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.noImageBox}>
                          <Ionicons name="person-circle-outline" size={48} color={colors.slate300} />
                          <Text style={{ fontSize: 12, color: colors.slate400, marginTop: 4 }}>No photo uploaded</Text>
                        </View>
                      )}

                      <View style={styles.modalPatientRow}>
                        <ProfileAvatar gender={undefined} role="patient" size={40} seed={selectedReport.patientId || selectedReport.patientName} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalPatientName}>{selectedReport.patientName}</Text>
                          <Text style={styles.modalCondition}>{selectedReport.acneType ?? 'Skin Report'}</Text>
                        </View>
                        <View style={[styles.gradeBadge, { backgroundColor: (igaLabels[selectedReport.igaScore] || igaLabels[2]).bg }]}>
                          <Text style={[styles.gradeText, { color: (igaLabels[selectedReport.igaScore] || igaLabels[2]).color }]}>IGA {selectedReport.igaScore}</Text>
                        </View>
                      </View>

                      <View style={styles.aiAnalysisBox}>
                        <View style={styles.aiAnalysisHeader}>
                          <Ionicons name="sparkles" size={14} color={colors.primary} />
                          <Text style={styles.aiAnalysisTitle}>AI Gemini Analysis</Text>
                        </View>
                        <View style={styles.aiScoreRow}>
                          {[
                            { label: 'Skin Score', value: `${selectedReport.skinScore ?? '—'}/100` },
                            { label: 'Confidence', value: `${selectedReport.confidence ?? '—'}%` },
                            { label: 'Lesions', value: selectedReport.lesionCount ?? '—' },
                            { label: 'IGA Grade', value: selectedReport.igaScore ?? '—' },
                          ].map((s) => (
                            <View key={s.label} style={styles.aiScoreItem}>
                              <Text style={styles.aiScoreValue}>{s.value}</Text>
                              <Text style={styles.aiScoreLabel}>{s.label}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.scoreBarWrap}>
                          <View style={styles.scoreBarBg}>
                            <View style={[styles.scoreBarFill, {
                              width: `${selectedReport.skinScore ?? 50}%`,
                              backgroundColor: (selectedReport.skinScore ?? 50) >= 70 ? colors.emerald : (selectedReport.skinScore ?? 50) >= 50 ? colors.amber : colors.rose,
                            }]} />
                          </View>
                          <Text style={styles.scoreBarLabel}>Skin Health Score</Text>
                        </View>
                        {selectedReport.recommendation ? (
                          <View style={styles.recBox}>
                            <Text style={styles.recLabel}>AI Recommendation</Text>
                            <Text style={styles.recText}>{selectedReport.recommendation}</Text>
                          </View>
                        ) : null}
                        {selectedReport.modifiedByDerma && (
                          <View style={styles.modifiedBadge}>
                            <Ionicons name="create-outline" size={12} color={colors.teal} />
                            <Text style={styles.modifiedBadgeText}>Derma-modified findings</Text>
                          </View>
                        )}
                      </View>

                      {reviewStep === 'modify' && (
                        <View style={styles.modifyBox}>
                          <Text style={styles.modifyTitle}>Override AI Findings</Text>
                          <Text style={styles.modifyHint}>Leave blank to keep the original AI value.</Text>
                          <Text style={styles.modalFieldLabel}>Condition Type</Text>
                          <TextInput style={styles.modalInput} value={modAcneType} onChangeText={setModAcneType}
                            placeholder="e.g. Moderate Acne Vulgaris" placeholderTextColor={colors.slate300} />
                          <Text style={styles.modalFieldLabel}>IGA Grade (0–4)</Text>
                          <TextInput style={styles.modalInput} value={modIga} onChangeText={setModIga}
                            placeholder="0–4" placeholderTextColor={colors.slate300} keyboardType="numeric" />
                          <Text style={styles.modalFieldLabel}>Skin Score (0–100)</Text>
                          <TextInput style={styles.modalInput} value={modSkinScore} onChangeText={setModSkinScore}
                            placeholder="0–100" placeholderTextColor={colors.slate300} keyboardType="numeric" />
                          <Text style={styles.modalFieldLabel}>Updated Recommendation</Text>
                          <TextInput style={[styles.modalInput, { minHeight: 72 }]} value={modRec} onChangeText={setModRec}
                            placeholder="Updated clinical recommendation..." placeholderTextColor={colors.slate300} multiline textAlignVertical="top" />
                        </View>
                      )}

                      <Text style={styles.modalFieldLabel}>Your Note (optional)</Text>
                      <TextInput style={styles.modalInput} value={dermaNote} onChangeText={setDermaNote}
                        placeholder="Add a clinical note..." placeholderTextColor={colors.slate300} multiline />

                      {reviewStep === 'view' && (
                        <View style={styles.modalActions}>
                          <TouchableOpacity style={styles.validateBtn} onPress={handleAccept} disabled={busy}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                            <Text style={styles.validateBtnText}>{busy ? 'Saving...' : 'Accept'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.modifyBtn} onPress={() => setReviewStep('modify')} disabled={busy}>
                            <Ionicons name="create-outline" size={18} color={colors.teal} />
                            <Text style={styles.modifyBtnText}>Modify</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectModal(true)} disabled={busy}>
                            <Ionicons name="close-circle-outline" size={18} color={colors.rose} />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {reviewStep === 'modify' && (
                        <View style={styles.modalActions}>
                          <TouchableOpacity style={[styles.validateBtn, { flex: 2 }]} onPress={handleModifyAndAccept} disabled={busy}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                            <Text style={styles.validateBtnText}>{busy ? 'Saving...' : 'Accept Modified'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.rejectBtn, { flex: 1 }]} onPress={() => setReviewStep('view')} disabled={busy}>
                            <Text style={styles.rejectBtnText}>Back</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity style={[styles.messageBtn, { marginTop: 8 }]} onPress={handleMessage} disabled={busy}>
                        <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                        <Text style={styles.messageBtnText}>Message Patient</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {reviewStep === 'rx' && (
                    <>
                      <View style={styles.validatedBanner}>
                        <Ionicons name="checkmark-circle" size={22} color={colors.emerald} />
                        <Text style={styles.validatedBannerText}>Report Validated Successfully!</Text>
                      </View>
                      <Text style={styles.rxPrompt}>Write a prescription for {selectedReport.patientName}?</Text>
                      {rxMeds.map((med, idx) => (
                        <View key={idx} style={styles.medCard}>
                          <View style={styles.medCardHeader}>
                            <Text style={styles.medCardTitle}>Medicine {idx + 1}</Text>
                            {rxMeds.length > 1 && (
                              <TouchableOpacity onPress={() => setRxMeds((p) => p.filter((_, i) => i !== idx))}>
                                <Ionicons name="trash-outline" size={15} color={colors.rose} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <TextInput style={styles.medInput} value={med.name}
                            onChangeText={(v) => updateRxMed(idx, 'name', v)}
                            placeholder="Medicine name" placeholderTextColor={colors.slate300} />
                          <TextInput style={styles.medInput} value={med.dosage}
                            onChangeText={(v) => updateRxMed(idx, 'dosage', v)}
                            placeholder="Dosage" placeholderTextColor={colors.slate300} />
                          <TextInput style={[styles.medInput, { minHeight: 50 }]} value={med.instructions}
                            onChangeText={(v) => updateRxMed(idx, 'instructions', v)}
                            placeholder="Instructions" placeholderTextColor={colors.slate300} multiline textAlignVertical="top" />
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addMedBtn} onPress={() => setRxMeds((p) => [...p, { name: '', dosage: '', instructions: '' }])}>
                        <Ionicons name="add-circle-outline" size={16} color={colors.teal} />
                        <Text style={styles.addMedText}>Add Medicine</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalFieldLabel}>Total Price (₱)</Text>
                      <TextInput style={styles.modalInput} value={rxPrice} onChangeText={setRxPrice}
                        placeholder="e.g. 850" placeholderTextColor={colors.slate300} keyboardType="numeric" />
                      <View style={styles.subNote}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                        <Text style={styles.subNoteText}>50% discount auto-applies for Premium subscribers only.</Text>
                      </View>
                      <TouchableOpacity style={[styles.validateBtn, { marginTop: 4 }]} onPress={handleSendPrescription} disabled={busy}>
                        <Ionicons name="send" size={18} color={colors.white} />
                        <Text style={styles.validateBtnText}>{busy ? 'Sending...' : 'Send Prescription'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.messageBtn, { marginTop: 8 }]} onPress={closeReview}>
                        <Text style={styles.messageBtnText}>Skip — Done</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ─── REJECT REASON MODAL ─── */}
        <Modal visible={rejectModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rejection Reason</Text>
                <TouchableOpacity onPress={() => setRejectModal(false)}>
                  <Ionicons name="close" size={22} color={colors.slate500} />
                </TouchableOpacity>
              </View>
              <Text style={styles.rejectLabel}>Please state why this diagnosis is being rejected:</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100 }]}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Enter rejection reason..."
                placeholderTextColor={colors.slate300}
                multiline
              />
              <TouchableOpacity
                style={[styles.rejectConfirmBtn, !rejectReason.trim() && { opacity: 0.5 }]}
                onPress={handleReject}
                disabled={!rejectReason.trim() || busy}
              >
                <Text style={styles.rejectConfirmText}>{busy ? 'Rejecting...' : 'Confirm Rejection'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Performance card */}
        <LinearGradient
          colors={[colors.teal, colors.tealDark]}
          style={styles.performanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.perfLeft}>
            <Text style={styles.perfTitle}>Your Performance</Text>
            <Text style={styles.perfSub}>This month</Text>
            <View style={styles.perfStats}>
              {[
                { label: 'Validated', value: '0' },
                { label: 'Consultations', value: '0' },
                { label: 'Avg. Rating', value: profile?.rating > 0 ? profile.rating.toString() : '—' },
              ].map((p) => (
                <View key={p.label} style={styles.perfStat}>
                  <Text style={styles.perfStatValue}>{p.value}</Text>
                  <Text style={styles.perfStatLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: { fontSize: 13, color: colors.slate400 },
  drName: { fontSize: 24, fontWeight: '800', color: colors.slate900 },
  drAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.teal,
  },
  drAvatarEmoji: { fontSize: 28 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: colors.slate400, fontWeight: '600' },

  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  quickActionBadgeText: { fontSize: 10, fontWeight: '800', color: colors.white },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: colors.slate700, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  seeAll: { fontSize: 13, color: colors.teal, fontWeight: '600' },
  pendingBadge: {
    backgroundColor: colors.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: colors.amber },

  apptList: { gap: 10, marginBottom: 24 },
  apptCard: {
    flexDirection: 'row',
    gap: 12,
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
  apptTimeCol: { alignItems: 'center', width: 46, flexShrink: 0 },
  apptTime: { fontSize: 11, fontWeight: '700', color: colors.teal, marginBottom: 4 },
  apptTypeDot: { width: 8, height: 8, borderRadius: 4 },
  apptContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  apptAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  apptEmoji: { fontSize: 20 },
  apptPatient: { fontSize: 13, fontWeight: '700', color: colors.slate800, flexShrink: 1 },
  apptIssue: { fontSize: 11, color: colors.slate500, marginTop: 1, flexShrink: 1 },
  apptMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  apptMeta: { fontSize: 10, color: colors.slate400, flexShrink: 1 },
  igaChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, marginLeft: 4 },
  igaChipText: { fontSize: 9, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  validationList: { gap: 10, marginBottom: 20 },
  validationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  validationImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.slate200,
  },
  validationImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationPatient: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  validationCondition: { fontSize: 11, color: colors.slate500, marginTop: 1 },
  validationMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  validationTime: { fontSize: 10, color: colors.slate400 },
  validationScore: { fontSize: 10, color: colors.teal, fontWeight: '600' },
  validationRight: { alignItems: 'flex-end', gap: 6 },
  gradeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  gradeText: { fontSize: 10, fontWeight: '700' },
  reviewBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  reviewBtnText: { fontSize: 11, fontWeight: '700', color: colors.white },

  performanceCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  perfLeft: { flex: 1 },
  perfTitle: { fontSize: 15, fontWeight: '800', color: colors.white, marginBottom: 2 },
  perfSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 12 },
  perfStats: { flexDirection: 'row', gap: 16 },
  perfStat: {},
  perfStatValue: { fontSize: 18, fontWeight: '900', color: colors.white },
  perfStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  emptyBoxText: { fontSize: 13, color: colors.slate400, fontWeight: '500' },

  // ── Modals ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },

  modalPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  modalPatientAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.tealLight,
    alignItems: 'center', justifyContent: 'center',
  },
  modalPatientName: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  modalCondition: { fontSize: 12, color: colors.slate500, marginTop: 2 },

  modalInfoBox: {
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLabel: { fontSize: 13, color: colors.slate500 },
  modalInfoValue: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.slate200,
    marginTop: 4,
  },

  modalFieldLabel: { fontSize: 13, fontWeight: '600', color: colors.slate700, marginBottom: 8 },
  modalInput: {
    backgroundColor: colors.slate50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 14,
    fontSize: 14,
    color: colors.slate800,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  validateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.teal,
    paddingVertical: 14,
    borderRadius: 14,
  },
  validateBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    borderRadius: 14,
  },
  messageBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff1f2',
    paddingVertical: 14,
    borderRadius: 14,
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: colors.rose },

  rejectLabel: { fontSize: 13, color: colors.slate600, marginBottom: 12, lineHeight: 20 },
  rejectConfirmBtn: {
    backgroundColor: colors.rose,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  rejectConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },

  // Reviews
  ratingOverview: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingOverviewText: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
  reviewsList: { gap: 10, marginBottom: 16 },
  reviewCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.slate100,
  },
  reviewCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  reviewName: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewDate: { fontSize: 10, color: colors.slate400 },
  reviewComment: { fontSize: 12, color: colors.slate600, marginTop: 8, lineHeight: 18 },

  // ── New review modal styles ──────────────────────────────────────────────────
  noImageBox: {
    width: '100%', height: 120, borderRadius: 16,
    backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  modalImage: {
    width: '100%', height: 220, borderRadius: 16,
    backgroundColor: colors.slate200, marginBottom: 12,
  },
  aiAnalysisBox: {
    backgroundColor: colors.primaryLight, borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: colors.primaryMid,
  },
  aiAnalysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  aiAnalysisTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  aiScoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  aiScoreItem: { alignItems: 'center' },
  aiScoreValue: { fontSize: 14, fontWeight: '800', color: colors.slate900 },
  aiScoreLabel: { fontSize: 9, color: colors.slate500, fontWeight: '600', marginTop: 2 },
  scoreBarWrap: { marginBottom: 10 },
  scoreBarBg: { height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 4 },
  scoreBarFill: { height: 7, borderRadius: 4 },
  scoreBarLabel: { fontSize: 10, color: colors.slate500 },
  recBox: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: 10, marginTop: 4 },
  recLabel: { fontSize: 10, fontWeight: '700', color: colors.primaryDark, marginBottom: 3 },
  recText: { fontSize: 12, color: colors.slate700, lineHeight: 18 },
  modifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  modifiedBadgeText: { fontSize: 11, color: colors.teal, fontWeight: '600' },

  modifyBox: {
    backgroundColor: '#fffbeb', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: colors.amberLight,
  },
  modifyTitle: { fontSize: 13, fontWeight: '700', color: colors.slate800, marginBottom: 2 },
  modifyHint: { fontSize: 11, color: colors.slate500, marginBottom: 12 },

  modifyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.tealLight, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.tealMid,
  },
  modifyBtnText: { fontSize: 14, fontWeight: '700', color: colors.teal },

  validatedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.emeraldLight, borderRadius: 14, paddingVertical: 14, marginBottom: 14,
  },
  validatedBannerText: { fontSize: 15, fontWeight: '700', color: colors.emerald },

  rxPrompt: { fontSize: 13, color: colors.slate600, marginBottom: 14, lineHeight: 20 },

  medCard: { backgroundColor: colors.slate50, borderRadius: 12, padding: 12, marginBottom: 10 },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medCardTitle: { fontSize: 12, fontWeight: '700', color: colors.slate600 },
  medInput: {
    backgroundColor: colors.white, borderRadius: 10, borderWidth: 1.5,
    borderColor: colors.slate200, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, color: colors.slate800, marginBottom: 7,
  },
  addMedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.teal, borderRadius: 12,
    paddingVertical: 10, marginBottom: 14,
  },
  addMedText: { fontSize: 13, fontWeight: '700', color: colors.teal },

  subNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10,
    marginBottom: 14,
  },
  subNoteText: { flex: 1, fontSize: 11, color: colors.primaryDark, lineHeight: 17 },
});
