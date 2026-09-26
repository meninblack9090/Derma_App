import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { igaLabels } from '../../data/constants';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSkinReports, requestValidation } from '../../firebase/firestore';

export default function ValidationScreen({ navigation }) {
  const { user } = useAuth();
  const [skinReports, setSkinReports] = useState([]);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSkinReports(user.uid, setSkinReports);
    return unsub;
  }, [user]);

  const handleSubmitValidation = async (report) => {
    if (report.validationRequested || report.isValidated) return;
    setSubmittingId(report.id);
    try {
      await requestValidation(report.id);
      Alert.alert('Submitted', 'Your scan has been sent to a dermatologist for review.');
    } catch {
      Alert.alert('Error', 'Could not submit. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.slate700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation Status</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{skinReports.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Dermatologist Validation</Text>
            <Text style={styles.infoSub}>
              All AI scans are reviewed by certified dermatologists for accuracy
            </Text>
          </View>
        </View>

        {/* Status summary */}
        <View style={styles.summaryRow}>
          {[
            {
              label: 'Validated',
              count: skinReports.filter((r) => r.status === 'Validated').length,
              color: colors.emerald,
              bg: colors.emeraldLight,
              icon: 'checkmark-circle-outline',
            },
            {
              label: 'Pending',
              count: skinReports.filter((r) => r.status === 'Pending').length,
              color: colors.amber,
              bg: '#fffbeb',
              icon: 'time-outline',
            },
            {
              label: 'Total',
              count: skinReports.length,
              color: colors.primary,
              bg: colors.primaryLight,
              icon: 'scan-outline',
            },
          ].map((s) => (
            <View key={s.label} style={[styles.summaryCard, { borderColor: s.color + '30' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={16} color={s.color} />
              </View>
              <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Reports */}
        <Text style={styles.sectionTitle}>All Scan Reports</Text>
        <View style={styles.reportsList}>
          {skinReports.map((report) => {
            const isValidated = report.isValidated;
            const isPending = report.validationRequested && !report.isValidated;
            const iga = igaLabels[report.igaScore] ?? igaLabels[2];
            return (
              <View key={report.id} style={styles.reportCard}>
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.reportIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="scan-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportType}>{report.acneType}</Text>
                    <View style={styles.reportDateRow}>
                      <Ionicons name="calendar-outline" size={10} color={colors.slate400} />
                      <Text style={styles.reportDate}>{report.date}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.igaBadge, { backgroundColor: iga.bg }]}>
                      <Text style={[styles.igaText, { color: iga.color }]}>IGA {report.igaScore}</Text>
                    </View>
                  </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  {[
                    { label: 'Skin Score', value: report.skinScore },
                    { label: 'Lesions', value: report.lesionCount },
                    { label: 'Confidence', value: `${report.confidence}%` },
                  ].map((s) => (
                    <View key={s.label} style={styles.statItem}>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Score bar */}
                <View style={styles.scoreBar}>
                  <View style={styles.scoreBarBg}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          width: `${report.skinScore}%`,
                          backgroundColor:
                            report.skinScore >= 70
                              ? colors.emerald
                              : report.skinScore >= 50
                              ? colors.amber
                              : colors.red,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Status footer */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isValidated ? colors.emeraldLight : isPending ? '#fffbeb' : colors.slate100 },
                    ]}
                  >
                    <Ionicons
                      name={isValidated ? 'checkmark-circle' : isPending ? 'time-outline' : 'ellipse-outline'}
                      size={12}
                      color={isValidated ? colors.emerald : isPending ? colors.amber : colors.slate400}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isValidated ? colors.emerald : isPending ? colors.amber : colors.slate400 },
                      ]}
                    >
                      {isValidated ? 'Validated' : isPending ? 'Pending Review' : 'Not Submitted'}
                    </Text>
                  </View>

                  {!isValidated && !isPending && (
                    <TouchableOpacity
                      style={[styles.viewBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => handleSubmitValidation(report)}
                      disabled={submittingId === report.id}
                    >
                      <Text style={[styles.viewBtnText, { color: colors.primary }]}>
                        {submittingId === report.id ? '...' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => navigation.navigate('Result', { reportId: report.id })}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Request new validation */}
        <TouchableOpacity style={styles.requestBtn} onPress={() => navigation.navigate('Scan')}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.requestBtnText}>Add New Scan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.slate900 },
  headerBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  infoSub: { fontSize: 11, color: colors.slate600, lineHeight: 16 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
  },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryCount: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: colors.slate400, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 12 },

  reportsList: { gap: 12, marginBottom: 16 },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportType: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  reportDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  reportDate: { fontSize: 10, color: colors.slate400 },
  cardRight: { alignItems: 'flex-end' },
  igaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  igaText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.slate800 },
  statLabel: { fontSize: 9, color: colors.slate400, fontWeight: '600', marginTop: 1 },

  scoreBar: { marginBottom: 12 },
  scoreBarBg: { height: 5, borderRadius: 3, backgroundColor: colors.slate100, overflow: 'hidden' },
  scoreBarFill: { height: 5, borderRadius: 3 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  requestBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
