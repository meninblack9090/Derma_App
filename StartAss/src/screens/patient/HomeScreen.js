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
import NotificationBell from '../../components/NotificationBell';
import { getLatestReport, subscribeToConsultations } from '../../firebase/firestore';

const { width } = Dimensions.get('window');

const quickActions = [
  { icon: 'scan-outline', label: 'AI Scan', color: colors.primary, bg: colors.primaryLight, nav: 'Scan' },
  { icon: 'medkit-outline', label: 'Symptom\nCheck', color: '#f59e0b', bg: '#fffbeb', nav: 'SymptomChecker' },
  { icon: 'people-outline', label: 'Consult', color: colors.teal, bg: colors.tealLight, nav: 'Consult' },
  { icon: 'bar-chart-outline', label: 'Reports', color: '#8b5cf6', bg: '#f5f3ff', nav: 'Reports' },
];

function ScoreRing({ score }) {
  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Text style={styles.ringScore}>{score}</Text>
          <Text style={styles.ringLabel}>score</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [latestReport, setLatestReport] = useState(null);
  const [upcomingConsult, setUpcomingConsult] = useState(null);

  useEffect(() => {
    if (!user) return;
    getLatestReport(user.uid).then(setLatestReport).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConsultations(user.uid, (list) => {
      const next = list.find((c) => c.status === 'upcoming');
      setUpcomingConsult(next ?? null);
    });
    return unsub;
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.username}>{profile?.displayName ?? 'Welcome'} 👋</Text>
          </View>
          <NotificationBell
            role="patient"
            notifications={[]}
            onPress={(notif) => {
              // Navigate based on notification type
              if (notif.icon === 'calendar-outline') navigation.navigate('Consult');
              else if (notif.icon === 'flask-outline') navigation.navigate('Reports');
              else if (notif.icon === 'scan-outline') navigation.navigate('Scan');
            }}
          />
        </View>

        {/* Skin Health Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.healthCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.healthCardTop}>
            <View>
              <Text style={styles.healthCardTitle}>Skin Health Score</Text>
              <Text style={styles.healthCardSub}>Complete a scan to get your score</Text>
            </View>
            <ScoreRing score={latestReport?.skinScore ?? '—'} />
          </View>
          <View style={styles.scoreBarWrap}>
            <View style={styles.scoreBarBg}>
              <View style={[styles.scoreBarFill, { width: `${latestReport?.skinScore ?? 0}%` }]} />
            </View>
            <Text style={styles.scoreBarLabel}>{latestReport?.skinScore ?? 0}/100</Text>
          </View>
          <View style={styles.statsRow}>
            {[
              { label: 'Total Scans', value: profile?.totalScans ?? 0 },
              { label: 'IGA Grade', value: latestReport?.igaScore ?? '—' },
              { label: 'Consults', value: profile?.totalConsults ?? 0 },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => navigation.navigate(a.nav)}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Latest Report */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest Report</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {latestReport ? (
          <TouchableOpacity
            style={styles.reportCard}
            onPress={() => navigation.navigate('Result', { reportId: latestReport.id })}
          >
            <View style={styles.reportLeft}>
              <View style={[styles.reportIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="scan-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.reportType}>{latestReport.acneType}</Text>
                <Text style={styles.reportDate}>{latestReport.date}</Text>
              </View>
            </View>
            <View style={styles.reportRight}>
              <Ionicons name="chevron-forward" size={16} color={colors.slate300} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emptyCard} onPress={() => navigation.navigate('Scan')}>
            <Ionicons name="scan-outline" size={36} color={colors.primary} />
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptySub}>Tap to start your first AI skin scan</Text>
          </TouchableOpacity>
        )}

        {/* Upcoming Consultation */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Consult')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {upcomingConsult ? (
          <TouchableOpacity style={styles.consultCard}>
            <View style={[styles.consultAvatar, { backgroundColor: colors.tealLight }]}>
              <Ionicons name="person-outline" size={22} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consultDoctor}>{upcomingConsult.dermaName}</Text>
              <Text style={styles.consultIssue}>{upcomingConsult.issue}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={colors.teal} />
            <Text style={styles.emptyTitle}>No upcoming consultations</Text>
            <Text style={styles.emptySub}>Book a dermatologist from the Consult tab</Text>
          </View>
        )}

        {/* Subscription promo */}
        <TouchableOpacity style={styles.promoCard} onPress={() => navigation.navigate('Subscription')}>
          <LinearGradient
            colors={['#7c3aed', '#4f46e5']}
            style={styles.promoGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View>
              <Text style={styles.promoTitle}>Upgrade to Premium</Text>
              <Text style={styles.promoSub}>Unlock unlimited scans & priority care</Text>
            </View>
            <Ionicons name="star" size={32} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: { fontSize: 13, color: colors.slate400 },
  username: { fontSize: 22, fontWeight: '800', color: colors.slate900 },
  headerRight: { flexDirection: 'row', gap: 8 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  healthCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  healthCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  healthCardTitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  healthCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2, marginBottom: 8 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  planText: { fontSize: 11, color: colors.white, fontWeight: '600' },

  ringContainer: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScore: { fontSize: 22, fontWeight: '800', color: colors.white },
  ringLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  scoreBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  scoreBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  scoreBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.white },
  scoreBarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.white },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: colors.slate700, textAlign: 'center' },

  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportType: { fontSize: 13, fontWeight: '700', color: colors.slate800 },
  reportDate: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  reportRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityText: { fontSize: 11, fontWeight: '600' },
  reportScore: { fontSize: 11, color: colors.slate500, fontWeight: '600' },

  consultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  consultAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  consultEmoji: { fontSize: 24 },
  consultDoctor: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  consultIssue: { fontSize: 11, color: colors.slate500, marginTop: 2 },
  consultMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  consultMetaText: { fontSize: 10, color: colors.slate400 },
  joinBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.slate100,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.slate600, marginTop: 4 },
  emptySub: { fontSize: 12, color: colors.slate400, textAlign: 'center' },

  promoCard: { borderRadius: 20, overflow: 'hidden' },
  promoGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  promoTitle: { fontSize: 15, fontWeight: '800', color: colors.white, marginBottom: 4 },
  promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
});
