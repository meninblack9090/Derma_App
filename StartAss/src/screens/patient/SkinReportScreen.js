import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSkinReports } from '../../firebase/firestore';
import { igaLabels } from '../../data/constants';

const { width } = Dimensions.get('window');

const CHART_H = 80;

export default function SkinReportScreen({ navigation }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSkinReports(user.uid, setReports);
    return unsub;
  }, [user]);

  const totalScans = reports.length;
  const validatedCount = reports.filter(r => r.isValidated || r.status === 'Validated').length;
  const rejectedCount = reports.filter(r => r.status === 'Rejected').length;
  const pendingCount = reports.filter(r => !r.isValidated && r.status !== 'Rejected' && r.validationRequested).length;
  const bestScore = reports.length > 0 ? Math.max(...reports.map(r => r.skinScore)) : 0;
  const trendData = reports.slice(-4).map(r => r.skinScore);
  const maxVal = trendData.length > 0 ? Math.max(...trendData) : 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skin Reports</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="filter-outline" size={20} color={colors.slate600} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Score trend chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Skin Score Trend</Text>
              <Text style={styles.chartSub}>{trendData.length > 0 ? `Last ${trendData.length} scans` : 'No scans yet'}</Text>
            </View>
            {trendData.length > 1 && (
              <View style={styles.trendBadge}>
                <Ionicons name="trending-up-outline" size={14} color={colors.emerald} />
                <Text style={styles.trendText}>+{trendData[trendData.length-1] - trendData[0]} pts</Text>
              </View>
            )}
          </View>
          {trendData.length > 0 ? (
            <View style={styles.chartArea}>
              {trendData.map((val, i) => {
                const barHeight = (val / maxVal) * CHART_H;
                const isLast = i === trendData.length - 1;
                return (
                  <View key={i} style={styles.barGroup}>
                    <Text style={styles.barValue}>{val}</Text>
                    <View style={styles.barBg}>
                      <LinearGradient
                        colors={isLast ? [colors.primary, colors.primaryDark] : [colors.primaryMid, colors.primaryLight]}
                        style={[styles.barFill, { height: barHeight }]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={32} color={colors.slate300} />
              <Text style={styles.chartEmptyText}>Scan your skin to see trends</Text>
            </View>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.statsRow}>
          {[
            { key: 'All', label: 'All', value: totalScans, icon: 'list-outline', color: colors.primary, bg: colors.primaryLight },
            { key: 'Validated', label: 'Validated', value: validatedCount, icon: 'checkmark-circle', color: colors.emerald, bg: colors.emeraldLight },
            { key: 'Rejected', label: 'Rejected', value: rejectedCount, icon: 'close-circle', color: '#e11d48', bg: '#fff1f2' },
            { key: 'Pending', label: 'Pending', value: pendingCount, icon: 'time', color: colors.amber, bg: '#fffbeb' },
          ].map((s) => {
            const isActive = activeFilter === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.statCard, isActive && { borderColor: s.color, borderWidth: 2 }]}
                onPress={() => setActiveFilter(s.key)}
              >
                <View style={[styles.statIcon, { backgroundColor: isActive ? s.color : s.bg }]}>
                  <Ionicons name={s.icon} size={16} color={isActive ? colors.white : s.color} />
                </View>
                <Text style={[styles.statValue, isActive && { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reports list */}
        <Text style={styles.sectionTitle}>
          {activeFilter === 'All' ? 'All Reports' : `${activeFilter} Reports`}
        </Text>
        {reports.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => navigation.navigate('Scan')}>
            <Ionicons name="scan-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptySub}>Start your first AI skin scan to build your history</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.reportsList}>
            {reports.filter((r) => {
              if (activeFilter === 'All') return true;
              if (activeFilter === 'Validated') return r.isValidated || r.status === 'Validated';
              if (activeFilter === 'Rejected') return r.status === 'Rejected';
              if (activeFilter === 'Pending') return !r.isValidated && r.status !== 'Rejected' && r.validationRequested;
              return true;
            }).map((report) => {
              const isExpanded = expanded === report.id;
              const iga = igaLabels[report.igaScore] || igaLabels[2];
              const isValidated = report.isValidated || report.status === 'Validated';
              const isRejected = report.status === 'Rejected';
              const statusColor = isValidated ? colors.emerald : isRejected ? '#e11d48' : colors.amber;
              const statusBg = isValidated ? colors.emeraldLight : isRejected ? '#fff1f2' : '#fffbeb';
              const statusIcon = isValidated ? 'checkmark-circle' : isRejected ? 'close-circle' : 'time';
              const statusLabel = isValidated ? 'Validated' : isRejected ? 'Rejected' : report.validationRequested ? 'Pending Review' : 'Pending';
              return (
                <View key={report.id} style={styles.reportCard}>
                  <TouchableOpacity
                    style={styles.reportCardHeader}
                    onPress={() => setExpanded(isExpanded ? null : report.id)}
                  >
                    <View style={styles.reportLeft}>
                      <View style={[styles.reportIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="scan-outline" size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.reportType}>{report.acneType}</Text>
                        <View style={styles.reportDateRow}>
                          <Ionicons name="calendar-outline" size={10} color={colors.slate400} />
                          <Text style={styles.reportDate}>{report.date}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.reportRight}>
                      <View style={[styles.validationBadge, { backgroundColor: statusBg }]}>
                        <Ionicons name={statusIcon} size={12} color={statusColor} />
                        <Text style={[styles.validationBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.slate400} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.reportScoreRow}>
                    <View style={styles.reportScoreBarBg}>
                      <View style={[styles.reportScoreBarFill, {
                        width: `${report.skinScore}%`,
                        backgroundColor: report.skinScore >= 70 ? colors.emerald : report.skinScore >= 50 ? colors.amber : colors.red,
                      }]} />
                    </View>
                    <Text style={styles.reportScoreText}>Score: {report.skinScore}</Text>
                  </View>
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.expandedDivider} />
                      <View style={styles.expandedGrid}>
                        {[
                          { label: 'IGA Score', value: `${report.igaScore} / 4` },
                          { label: 'Lesion Count', value: `${report.lesionCount} lesions` },
                          { label: 'AI Confidence', value: `${report.confidence}%` },
                          { label: 'Status', value: statusLabel },
                        ].map((d) => (
                          <View key={d.label} style={styles.expandedItem}>
                            <Text style={styles.expandedItemLabel}>{d.label}</Text>
                            <Text style={[styles.expandedItemValue, d.label === 'Status' && { color: statusColor }]}>{d.value}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Rejection reason */}
                      {isRejected && report.rejectionReason && (
                        <View style={styles.rejectionBox}>
                          <Ionicons name="alert-circle" size={14} color="#e11d48" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rejectionTitle}>Rejection Reason</Text>
                            <Text style={styles.rejectionText}>{report.rejectionReason}</Text>
                          </View>
                        </View>
                      )}

                      {/* Derma note */}
                      {isValidated && report.dermaNote ? (
                        <View style={styles.dermaNote}>
                          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dermaNoteTitle}>Doctor's Note</Text>
                            <Text style={styles.dermaNoteText}>{report.dermaNote}</Text>
                          </View>
                        </View>
                      ) : null}

                      <View style={[styles.recBox, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                        <Text style={styles.recText}>{report.recommendation}</Text>
                      </View>
                      <TouchableOpacity style={styles.viewFullBtn} onPress={() => navigation.navigate('Result', { reportId: report.id })}>
                        <Text style={styles.viewFullText}>View Full Report</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.slate900 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  chartSub: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emeraldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  trendText: { fontSize: 12, color: colors.emerald, fontWeight: '700' },

  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: CHART_H + 40,
    paddingTop: 8,
  },
  barGroup: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, color: colors.slate500, fontWeight: '600' },
  barBg: {
    width: 36,
    height: CHART_H,
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.slate100,
  },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 9, color: colors.slate400, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  statLabel: { fontSize: 9, color: colors.slate400, fontWeight: '600', textAlign: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 12 },

  reportsList: { gap: 10 },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 8,
  },
  reportLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportType: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  reportDateRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  reportDate: { fontSize: 10, color: colors.slate400 },
  reportRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  validationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  validationBadgeText: { fontSize: 10, fontWeight: '700' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityText: { fontSize: 10, fontWeight: '700' },

  reportScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  reportScoreBarBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.slate100, overflow: 'hidden' },
  reportScoreBarFill: { height: 5, borderRadius: 3 },
  reportScoreText: { fontSize: 10, color: colors.slate500, fontWeight: '700', minWidth: 60 },

  expandedSection: { paddingHorizontal: 14, paddingBottom: 14 },
  expandedDivider: { height: 1, backgroundColor: colors.slate100, marginBottom: 12 },
  expandedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  expandedItem: { width: '47%', backgroundColor: colors.slate50, borderRadius: 10, padding: 10 },
  expandedItemLabel: { fontSize: 10, color: colors.slate400, marginBottom: 2 },
  expandedItemValue: { fontSize: 12, fontWeight: '700', color: colors.slate800 },
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fff1f2', borderRadius: 12,
    padding: 12, marginBottom: 12,
  },
  rejectionTitle: { fontSize: 11, fontWeight: '700', color: '#e11d48', marginBottom: 2 },
  rejectionText: { fontSize: 12, color: '#e11d48', lineHeight: 18 },

  dermaNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.primaryLight, borderRadius: 12,
    padding: 12, marginBottom: 12,
  },
  dermaNoteTitle: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  dermaNoteText: { fontSize: 12, color: colors.primaryDark, lineHeight: 18 },

  recBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  recText: { flex: 1, fontSize: 11, color: colors.slate700, lineHeight: 16 },
  viewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  viewFullText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  chartEmpty: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  chartEmptyText: { fontSize: 12, color: colors.slate400 },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.slate600 },
  emptySub: { fontSize: 12, color: colors.slate400, textAlign: 'center', lineHeight: 18 },
});
