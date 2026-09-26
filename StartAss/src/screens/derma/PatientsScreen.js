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
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProfileAvatar from '../../components/ProfileAvatar';
import { colors } from '../../theme/colors';
import { igaLabels } from '../../data/constants';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToDermaPatients,
  subscribeToSkinReports,
  validateReport,
  rejectReport,
  getOrCreateConversation,
  subscribeToPendingValidations,
  subscribeToDermaValidationLogs,
} from '../../firebase/firestore';

const gradeFilters = ['All', 'IGA 0', 'IGA 1', 'IGA 2', 'IGA 3', 'IGA 4'];

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('patients');
  const [dermaPatients, setDermaPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientReports, setPatientReports] = useState([]);

  // Validation logs data
  const [pendingAll, setPendingAll] = useState([]);
  const [myLogs, setMyLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('All');
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDermaPatients(user.uid, setDermaPatients);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToPendingValidations(user.uid, setPendingAll);
    const unsub2 = subscribeToDermaValidationLogs(user.uid, setMyLogs);
    return () => { unsub1(); unsub2(); };
  }, [user]);

  useEffect(() => {
    if (!selectedPatient) { setPatientReports([]); return; }
    const unsub = subscribeToSkinReports(selectedPatient.id, setPatientReports);
    return unsub;
  }, [selectedPatient]);

  const filtered = dermaPatients.filter((p) => {
    const matchName = (p.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === 'All' || gradeFilter === 'IGA ' + p.igaGrade;
    return matchName && matchGrade;
  });

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleValidate = async (reportId) => {
    try {
      await validateReport(reportId, user.uid, '');
      Alert.alert('Success', 'Report validated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const openRejectModal = (reportId) => {
    setRejectTargetId(reportId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectTargetId || !rejectReason.trim() || busy) return;
    setBusy(true);
    try {
      await rejectReport(rejectTargetId, user.uid, rejectReason.trim());
      setRejectModalVisible(false);
      setRejectTargetId(null);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const validatedReports = patientReports.filter(r => r.isValidated || r.status === 'Validated');
  const rejectedReports = patientReports.filter(r => r.status === 'Rejected');
  const pendingReports = patientReports.filter(r => !r.isValidated && r.status !== 'Rejected' && r.validationRequested);

  const handleMessage = async (patient) => {
    try {
      await getOrCreateConversation(
        patient.id,
        user.uid,
        patient.name,
        profile?.displayName ?? 'Doctor'
      );
      Alert.alert('Conversation created', 'Go to Messages to chat with this patient.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Combined logs: my validated/rejected + pending I can act on
  const allLogItems = (() => {
    const combined = [
      ...myLogs.map(r => ({ ...r, _source: 'log' })),
      ...pendingAll.filter(r => !myLogs.find(l => l.id === r.id)).map(r => ({ ...r, _source: 'pending' })),
    ];
    let filtered = combined;
    if (logFilter === 'Validated') filtered = combined.filter(r => r.isValidated || r.status === 'Validated');
    else if (logFilter === 'Rejected') filtered = combined.filter(r => r.status === 'Rejected');
    else if (logFilter === 'Pending') filtered = combined.filter(r => !r.isValidated && r.status !== 'Rejected');
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      filtered = filtered.filter(r =>
        (r.patientName ?? '').toLowerCase().includes(q) ||
        (r.acneType ?? '').toLowerCase().includes(q)
      );
    }
    return filtered;
  })();

  const logValidatedCount = myLogs.filter(r => r.isValidated || r.status === 'Validated').length;
  const logRejectedCount = myLogs.filter(r => r.status === 'Rejected').length;

  const renderLogCard = (report) => {
    const rIga = igaLabels[report.igaScore] || igaLabels[2];
    const isValidated = report.isValidated || report.status === 'Validated';
    const isRejected = report.status === 'Rejected';
    const isPending = !isValidated && !isRejected;
    const statusColor = isValidated ? colors.emerald : isRejected ? colors.rose : colors.amber;
    const statusBg = isValidated ? colors.emeraldLight : isRejected ? '#fff1f2' : '#fffbeb';
    const statusLabel = isValidated ? 'Validated' : isRejected ? 'Rejected' : 'Pending';
    return (
      <View key={report.id} style={styles.logCard}>
        <View style={styles.logCardTop}>
          {report.imageUrl ? (
            <Image source={{ uri: report.imageUrl }} style={styles.logThumb} />
          ) : (
            <View style={styles.logThumbPlaceholder}>
              <Ionicons name="image-outline" size={16} color={colors.slate300} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.logPatient}>{report.patientName ?? 'Patient'}</Text>
            <Text style={styles.logType}>{report.acneType ?? 'Skin Report'} · {report.date ?? ''}</Text>
          </View>
          <View style={[styles.logStatusBadge, { backgroundColor: statusBg }]}>
            <Ionicons name={isValidated ? 'checkmark-circle' : isRejected ? 'close-circle' : 'time'} size={12} color={statusColor} />
            <Text style={[styles.logStatusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.logMeta}>
          <View style={styles.logMetaItem}>
            <Text style={styles.logMetaLabel}>Score</Text>
            <Text style={styles.logMetaValue}>{report.skinScore ?? '—'}/100</Text>
          </View>
          <View style={styles.logMetaItem}>
            <Text style={styles.logMetaLabel}>IGA</Text>
            <Text style={[styles.logMetaValue, { color: rIga.color }]}>{report.igaScore}</Text>
          </View>
          <View style={styles.logMetaItem}>
            <Text style={styles.logMetaLabel}>Confidence</Text>
            <Text style={styles.logMetaValue}>{report.confidence ?? '—'}%</Text>
          </View>
        </View>
        {isRejected && report.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="alert-circle" size={14} color={colors.rose} />
            <Text style={styles.rejectionText}>{report.rejectionReason}</Text>
          </View>
        )}
        {isValidated && report.dermaNote ? (
          <View style={styles.dermaNoteBanner}>
            <Ionicons name="document-text-outline" size={14} color={colors.teal} />
            <Text style={styles.dermaNoteText}>{report.dermaNote}</Text>
          </View>
        ) : null}
        {isPending && (
          <View style={styles.reportActions}>
            <TouchableOpacity style={[styles.validateBtn, { flex: 1 }]} onPress={() => handleValidate(report.id)}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.white} />
              <Text style={styles.validateBtnText}>Validate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rejectReportBtn, { flex: 1 }]} onPress={() => openRejectModal(report.id)}>
              <Ionicons name="close-circle-outline" size={16} color={colors.rose} />
              <Text style={styles.rejectReportBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'patients' ? 'My Patients' : 'Validation Logs'}
        </Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>
            {activeTab === 'patients' ? `${dermaPatients.length} total` : `${allLogItems.length} reports`}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'patients' && styles.tabActive]}
          onPress={() => setActiveTab('patients')}
        >
          <Ionicons name="people-outline" size={16} color={activeTab === 'patients' ? colors.teal : colors.slate400} />
          <Text style={[styles.tabText, activeTab === 'patients' && styles.tabTextActive]}>Patients</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.tabActive]}
          onPress={() => setActiveTab('logs')}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={activeTab === 'logs' ? colors.teal : colors.slate400} />
          <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>Validation Logs</Text>
          {pendingAll.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingAll.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'patients' ? (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search patients..."
              placeholderTextColor={colors.slate300}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.slate400} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {gradeFilters.map((g) => {
              const active = gradeFilter === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setGradeFilter(g)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {filtered.map((patient) => {
              const iga = igaLabels[patient.igaGrade] || igaLabels[2];
              return (
                <TouchableOpacity
                  key={patient.id}
                  style={styles.patientCard}
                  onPress={() => setSelectedPatient(patient)}
                >
                  <View style={styles.patientLeft}>
                    <ProfileAvatar gender={undefined} role="patient" size={44} seed={patient.name || patient.id} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientInfo}>
                        {patient.issue ?? 'Patient'} · Last visit: {patient.lastVisit || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.patientRight}>
                    <View style={[styles.igaBadge, { backgroundColor: iga.bg }]}>
                      <Text style={[styles.igaText, { color: iga.color }]}>IGA {patient.igaGrade}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.slate300} />
                  </View>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={48} color={colors.slate300} />
                <Text style={styles.emptyTitle}>No patients found</Text>
                <Text style={{ fontSize: 12, color: colors.slate400, marginTop: 4 }}>
                  Patients appear here after they book a consultation with you
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <>
          {/* Clickable summary cards as filters */}
          <View style={styles.logSummaryRow}>
            {[
              { key: 'Validated', icon: 'checkmark-circle', value: logValidatedCount, color: colors.emerald, bg: colors.emeraldLight },
              { key: 'Rejected', icon: 'close-circle', value: logRejectedCount, color: colors.rose, bg: '#fff1f2' },
              { key: 'Pending', icon: 'time', value: pendingAll.length, color: colors.amber, bg: '#fffbeb' },
            ].map((s) => {
              const isActive = logFilter === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.logSummaryCard, { backgroundColor: s.bg }, isActive && { borderWidth: 2, borderColor: s.color }]}
                  onPress={() => setLogFilter(logFilter === s.key ? 'All' : s.key)}
                >
                  <Ionicons name={s.icon} size={20} color={s.color} />
                  <Text style={[styles.logSummaryValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.logSummaryLabel}>{s.key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search bar */}
          <View style={styles.logSearchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={logSearch}
              onChangeText={setLogSearch}
              placeholder="Search by patient name or condition..."
              placeholderTextColor={colors.slate300}
            />
            {logSearch.length > 0 && (
              <TouchableOpacity onPress={() => setLogSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.slate400} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {allLogItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={48} color={colors.slate300} />
                <Text style={styles.emptyTitle}>
                  {logSearch.trim() ? 'No matching reports' : logFilter !== 'All' ? `No ${logFilter.toLowerCase()} reports` : 'No validation logs yet'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.slate400, marginTop: 4 }}>
                  {logSearch.trim() ? 'Try a different search term' : 'Reports you validate or reject will appear here'}
                </Text>
              </View>
            ) : (
              allLogItems.map(renderLogCard)
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={!!selectedPatient} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalSheet}
            contentContainerStyle={{ paddingBottom: 24 + Math.max(insets.bottom, 16) }}
            showsVerticalScrollIndicator={false}
          >
            {selectedPatient && (
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalPatientInfo}>
                    <ProfileAvatar gender={undefined} role="patient" size={52} seed={selectedPatient.name || selectedPatient.id} />
                    <View>
                      <Text style={styles.modalPatientName}>{selectedPatient.name}</Text>
                      <Text style={styles.modalPatientSub}>{selectedPatient.issue ?? 'Patient'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPatient(null)}>
                    <Ionicons name="close" size={18} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.igaCard, { backgroundColor: (igaLabels[selectedPatient.igaGrade] || igaLabels[2]).bg }]}>
                  <View>
                    <Text style={[styles.igaCardLabel, { color: (igaLabels[selectedPatient.igaGrade] || igaLabels[2]).color }]}>
                      Current IGA Grade
                    </Text>
                    <Text style={styles.igaCardGrade}>
                      IGA Grade {selectedPatient.igaGrade} — {(igaLabels[selectedPatient.igaGrade] || igaLabels[2]).label}
                    </Text>
                  </View>
                  <Text style={styles.igaEmoji}>
                    {selectedPatient.igaGrade >= 4 ? '🔴' : selectedPatient.igaGrade >= 3 ? '🟠' : selectedPatient.igaGrade >= 2 ? '🔵' : '🟢'}
                  </Text>
                </View>

                {/* Validation Logs */}
                <Text style={styles.detailsTitle}>Validation Logs</Text>
                <View style={styles.logStatsRow}>
                  <View style={[styles.logStat, { backgroundColor: colors.emeraldLight }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.emerald} />
                    <Text style={[styles.logStatText, { color: colors.emerald }]}>{validatedReports.length} Validated</Text>
                  </View>
                  <View style={[styles.logStat, { backgroundColor: '#fff1f2' }]}>
                    <Ionicons name="close-circle" size={14} color={colors.rose} />
                    <Text style={[styles.logStatText, { color: colors.rose }]}>{rejectedReports.length} Rejected</Text>
                  </View>
                  <View style={[styles.logStat, { backgroundColor: '#fffbeb' }]}>
                    <Ionicons name="time" size={14} color={colors.amber} />
                    <Text style={[styles.logStatText, { color: colors.amber }]}>{pendingReports.length} Pending</Text>
                  </View>
                </View>

                {/* Scan reports for this patient */}
                <Text style={styles.detailsTitle}>Scan Reports ({patientReports.length})</Text>
                {patientReports.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={{ color: colors.slate400, fontSize: 13 }}>No scan reports yet</Text>
                  </View>
                ) : (
                  patientReports.map((report) => {
                    const rIga = igaLabels[report.igaScore] || igaLabels[2];
                    const isValidated = report.isValidated || report.status === 'Validated';
                    const isRejected = report.status === 'Rejected';
                    const isPending = !isValidated && !isRejected;
                    const statusColor = isValidated ? colors.emerald : isRejected ? colors.rose : colors.amber;
                    const statusBg = isValidated ? colors.emeraldLight : isRejected ? '#fff1f2' : '#fffbeb';
                    const statusLabel = isValidated ? 'Validated' : isRejected ? 'Rejected' : 'Pending';
                    return (
                      <View key={report.id} style={styles.detailsCard}>
                        {/* Status badge */}
                        <View style={[styles.reportStatusBadge, { backgroundColor: statusBg }]}>
                          <Ionicons
                            name={isValidated ? 'checkmark-circle' : isRejected ? 'close-circle' : 'time'}
                            size={14} color={statusColor}
                          />
                          <Text style={[styles.reportStatusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>

                        {report.imageUrl ? (
                          <Image
                            source={{ uri: report.imageUrl }}
                            style={styles.reportImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.noImagePlaceholder}>
                            <Ionicons name="image-outline" size={24} color={colors.slate300} />
                            <Text style={{ fontSize: 11, color: colors.slate400 }}>No photo uploaded</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.slate800 }}>{report.acneType ?? 'Skin Report'}</Text>
                            <Text style={{ fontSize: 11, color: colors.slate400, marginTop: 2 }}>{report.date}</Text>
                          </View>
                          <View style={[styles.igaBadge, { backgroundColor: rIga.bg }]}>
                            <Text style={[styles.igaText, { color: rIga.color }]}>IGA {report.igaScore}</Text>
                          </View>
                        </View>
                        <View style={styles.detailsGrid}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Skin Score</Text>
                            <Text style={styles.detailValue}>{report.skinScore}/100</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Confidence</Text>
                            <Text style={styles.detailValue}>{report.confidence}%</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Lesions</Text>
                            <Text style={styles.detailValue}>{report.lesionCount}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <Text style={[styles.detailValue, { color: statusColor }]}>{statusLabel}</Text>
                          </View>
                        </View>

                        {/* Rejection reason */}
                        {isRejected && report.rejectionReason && (
                          <View style={styles.rejectionBox}>
                            <Ionicons name="alert-circle" size={14} color={colors.rose} />
                            <Text style={styles.rejectionText}>{report.rejectionReason}</Text>
                          </View>
                        )}

                        {/* Derma note */}
                        {isValidated && report.dermaNote ? (
                          <View style={styles.dermaNoteBanner}>
                            <Ionicons name="document-text-outline" size={14} color={colors.teal} />
                            <Text style={styles.dermaNoteText}>{report.dermaNote}</Text>
                          </View>
                        ) : null}

                        {/* Action buttons for pending */}
                        {isPending && report.validationRequested && (
                          <View style={styles.reportActions}>
                            <TouchableOpacity
                              style={styles.validateBtn}
                              onPress={() => handleValidate(report.id)}
                            >
                              <Ionicons name="shield-checkmark-outline" size={16} color={colors.white} />
                              <Text style={styles.validateBtnText}>Validate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectReportBtn}
                              onPress={() => openRejectModal(report.id)}
                            >
                              <Ionicons name="close-circle-outline" size={16} color={colors.rose} />
                              <Text style={styles.rejectReportBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {isValidated && (
                          <View style={styles.validatedBanner}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
                            <Text style={styles.validatedText}>Validated</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.messageBtn} onPress={() => handleMessage(selectedPatient)}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.teal} />
                    <Text style={styles.messageBtnText}>Message Patient</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Reject reason modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.rejectOverlay}>
          <View style={[styles.rejectCard, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            <View style={styles.rejectHeader}>
              <Text style={styles.rejectTitle}>Rejection Reason</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.slate500} />
              </TouchableOpacity>
            </View>
            <Text style={styles.rejectSubtext}>Explain why this report is being rejected:</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter reason..."
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
  totalBadge: { backgroundColor: colors.tealLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  totalText: { fontSize: 12, fontWeight: '700', color: colors.teal },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.teal },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.slate400 },
  tabTextActive: { color: colors.teal, fontWeight: '700' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate800 },

  filterScroll: { marginTop: 10 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingRight: 24 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  filterChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  filterChipTextActive: { color: colors.white },

  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  patientLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  patientAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  patientEmoji: { fontSize: 26 },
  patientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  patientName: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  patientInfo: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  patientCondition: { fontSize: 11, color: colors.slate600, marginTop: 2, fontWeight: '500' },
  patientRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  igaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  igaText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate500 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalContent: { padding: 24, paddingBottom: 40 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalPatientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalEmoji: { fontSize: 28 },
  modalPatientName: { fontSize: 17, fontWeight: '800', color: colors.slate900 },
  modalPatientSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },

  igaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  igaCardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  igaCardGrade: { fontSize: 17, fontWeight: '800', color: colors.slate900, marginBottom: 2 },
  igaCardCondition: { fontSize: 12, color: colors.slate600 },
  igaEmoji: { fontSize: 40 },

  reportImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.slate200,
  },
  noImagePlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 4,
  },
  detailsCard: { backgroundColor: colors.slate50, borderRadius: 16, padding: 14, marginBottom: 12 },
  detailsTitle: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: '47%' },
  detailLabel: { fontSize: 10, color: colors.slate400, marginBottom: 1 },
  detailValue: { fontSize: 12, fontWeight: '600', color: colors.slate700 },

  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.tealLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.tealMid,
  },
  recText: { flex: 1, fontSize: 12, color: colors.slate700, lineHeight: 18 },

  modalActions: { gap: 10 },
  validatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.emeraldLight,
    borderRadius: 14,
    paddingVertical: 13,
  },
  validatedText: { fontSize: 14, fontWeight: '700', color: colors.emerald },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal,
    borderRadius: 14,
    paddingVertical: 13,
  },
  validateBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.tealLight,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.tealMid,
  },
  messageBtnText: { fontSize: 14, fontWeight: '700', color: colors.teal },

  // Validation logs
  logStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  logStat: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
  },
  logStatText: { fontSize: 11, fontWeight: '700' },

  reportStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, marginBottom: 10,
  },
  reportStatusText: { fontSize: 11, fontWeight: '700' },

  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fff1f2', borderRadius: 12,
    padding: 12, marginTop: 8, marginBottom: 4,
  },
  rejectionText: { flex: 1, fontSize: 12, color: colors.rose, lineHeight: 18 },

  dermaNoteBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.tealLight, borderRadius: 12,
    padding: 12, marginTop: 8,
  },
  dermaNoteText: { flex: 1, fontSize: 12, color: colors.teal, lineHeight: 18 },

  reportActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rejectReportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fff1f2', borderRadius: 14, paddingVertical: 13,
  },
  rejectReportBtnText: { fontSize: 14, fontWeight: '700', color: colors.rose },

  // Reject modal
  rejectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  rejectCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24 },
  rejectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rejectTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  rejectSubtext: { fontSize: 13, color: colors.slate500, marginBottom: 12, lineHeight: 20 },
  rejectInput: {
    backgroundColor: colors.slate50, borderRadius: 14, borderWidth: 1,
    borderColor: colors.slate200, padding: 14, fontSize: 14,
    color: colors.slate800, minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
  },
  rejectConfirmBtn: { backgroundColor: colors.rose, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  rejectConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },

  logSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 46,
  },

  // Log summary
  logSummaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  logSummaryCard: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 14,
  },
  logSummaryValue: { fontSize: 20, fontWeight: '900' },
  logSummaryLabel: { fontSize: 10, fontWeight: '600', color: colors.slate500 },

  // Log cards
  logCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.slate100,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  logCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  logThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.slate200 },
  logThumbPlaceholder: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center',
  },
  logPatient: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  logType: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  logStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  logStatusText: { fontSize: 10, fontWeight: '700' },
  logMeta: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colors.slate50, borderRadius: 12, padding: 10, marginBottom: 6,
  },
  logMetaItem: { flex: 1, alignItems: 'center' },
  logMetaLabel: { fontSize: 10, color: colors.slate400, marginBottom: 2 },
  logMetaValue: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
});
