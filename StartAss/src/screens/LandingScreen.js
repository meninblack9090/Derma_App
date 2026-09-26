import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ═══════════ HERO ═══════════ */}
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#0f172a']}
          style={styles.heroBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative orbs */}
          <View style={styles.orbWrap} pointerEvents="none">
            <View style={styles.orbBlue} />
            <View style={styles.orbGreen} />
            <View style={styles.orbViolet} />
          </View>

          <SafeAreaView edges={['top']}>
            <View style={styles.heroContent}>
              {/* Logo icon */}
              <LinearGradient
                colors={['#3b82f6', '#10b981']}
                style={styles.logoIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="medical" size={44} color="#fff" />
              </LinearGradient>

              {/* Brand */}
              <Text style={styles.brandName}>
                Derma<Text style={styles.brandAccent}>Link</Text>
              </Text>

              {/* AI badge */}
              <View style={styles.aiBadge}>
                <View style={styles.aiDot} />
                <Text style={styles.aiBadgeText}>AI-Powered Skin Analysis</Text>
              </View>

              {/* Tagline */}
              <Text style={styles.heroDesc}>
                Smart diagnostics meets expert{'\n'}dermatologist validation
              </Text>

              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { val: '50K+', lbl: 'Users', icon: 'people' },
                  { val: '99%', lbl: 'Accuracy', icon: 'checkmark-circle' },
                  { val: '500+', lbl: 'Doctors', icon: 'medkit' },
                ].map((s, i) => (
                  <View key={s.lbl} style={[styles.statBox, i < 2 && styles.statBorder]}>
                    <Ionicons name={s.icon} size={13} color="rgba(94,234,212,0.5)" />
                    <Text style={styles.statVal}>{s.val}</Text>
                    <Text style={styles.statLbl}>{s.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ═══════════ BODY ═══════════ */}
        <View style={styles.body}>
          <View style={styles.curveClip} />

          {/* ── Portal section ──────────────── */}
          <View style={styles.secHead}>
            <View style={styles.secDot} />
            <Text style={styles.secTitle}>Choose your portal</Text>
          </View>

          {/* Patient */}
          <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('PatientSignIn')}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb', '#1d4ed8']}
              style={styles.portal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.pOrb, { top: -24, right: -24, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
              <View style={[styles.pOrb, { width: 90, height: 90, bottom: -20, left: -10, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
              <View style={styles.pHead}>
                <View style={styles.pIcon}>
                  <Ionicons name="person" size={24} color="#3b82f6" />
                </View>
                <View style={styles.pInfo}>
                  <Text style={styles.pLabel}>PATIENT</Text>
                  <Text style={styles.pTitle}>Patient Portal</Text>
                </View>
                <View style={styles.pArr}>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
              <Text style={styles.pDesc}>Scan your skin, track progress and consult with certified dermatologists</Text>
              <View style={styles.pFeats}>
                {[
                  { icon: 'camera-outline', text: 'AI Scan' },
                  { icon: 'chatbubbles-outline', text: 'Chat' },
                  { icon: 'analytics-outline', text: 'Reports' },
                ].map((f) => (
                  <View key={f.text} style={styles.pFeat}>
                    <View style={styles.pFeatDot}>
                      <Ionicons name={f.icon} size={13} color="#fff" />
                    </View>
                    <Text style={styles.pFeatTxt}>{f.text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Dermatologist */}
          <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('DermaSignIn')}>
            <LinearGradient
              colors={['#0d9488', '#059669', '#047857']}
              style={styles.portal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.pOrb, { top: -24, right: -24, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
              <View style={[styles.pOrb, { width: 90, height: 90, bottom: -20, left: -10, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
              <View style={styles.pHead}>
                <View style={[styles.pIcon, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="medkit" size={24} color="#10b981" />
                </View>
                <View style={styles.pInfo}>
                  <Text style={styles.pLabel}>DOCTOR</Text>
                  <Text style={styles.pTitle}>Dermatologist Portal</Text>
                </View>
                <View style={styles.pArr}>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
              <Text style={styles.pDesc}>Validate AI scans, manage patients and handle appointments efficiently</Text>
              <View style={styles.pFeats}>
                {[
                  { icon: 'shield-checkmark-outline', text: 'Validate' },
                  { icon: 'people-outline', text: 'Patients' },
                  { icon: 'calendar-outline', text: 'Schedule' },
                ].map((f) => (
                  <View key={f.text} style={styles.pFeat}>
                    <View style={styles.pFeatDot}>
                      <Ionicons name={f.icon} size={13} color="#fff" />
                    </View>
                    <Text style={styles.pFeatTxt}>{f.text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Features ────────────────────── */}
          <View style={styles.secHead}>
            <View style={[styles.secDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.secTitle}>Why DermaLink?</Text>
          </View>

          <View style={styles.featGrid}>
            {[
              { icon: 'scan', title: 'AI Analysis', desc: 'Instant skin scan powered by deep learning', c: '#3b82f6', g: ['#eff6ff', '#dbeafe'] },
              { icon: 'shield-checkmark', title: 'Verified', desc: 'Expert dermatologist validated results', c: '#10b981', g: ['#ecfdf5', '#d1fae5'] },
              { icon: 'chatbubbles', title: 'Consult', desc: 'Direct messaging with your doctor', c: '#0d9488', g: ['#f0fdfa', '#ccfbf1'] },
              { icon: 'lock-closed', title: 'Secure', desc: 'End-to-end encrypted health data', c: '#8b5cf6', g: ['#f5f3ff', '#ede9fe'] },
            ].map((f) => (
              <View key={f.title} style={styles.featCard}>
                <LinearGradient colors={f.g} style={styles.featIco} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={f.icon} size={22} color={f.c} />
                </LinearGradient>
                <Text style={styles.featTitle}>{f.title}</Text>
                <Text style={styles.featDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── How it works ────────────────── */}
          <View style={styles.secHead}>
            <View style={[styles.secDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.secTitle}>How it works</Text>
          </View>

          <View style={styles.stepsCard}>
            {[
              { icon: 'camera', title: 'Scan', desc: 'Take a photo of your skin concern', c: '#3b82f6' },
              { icon: 'sparkles', title: 'Analyze', desc: 'AI processes and grades severity', c: '#f59e0b' },
              { icon: 'shield-checkmark', title: 'Validate', desc: 'Dermatologist reviews and confirms', c: '#10b981' },
              { icon: 'heart', title: 'Treat', desc: 'Get personalized care plan', c: '#e11d48' },
            ].map((s, i, arr) => (
              <View key={s.title}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepCircle, { backgroundColor: `${s.c}18` }]}>
                    <Ionicons name={s.icon} size={18} color={s.c} />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.stepLine} />}
              </View>
            ))}
          </View>

          {/* ── CTA ─────────────────────────── */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('PatientSignUp')}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.ctaTxt}>Create a free account</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.altRow} onPress={() => navigation.navigate('PatientSignIn')} activeOpacity={0.7}>
            <Text style={styles.altTxt}>Already have an account? <Text style={styles.altLink}>Sign In</Text></Text>
          </TouchableOpacity>

          {/* ── Footer ──────────────────────── */}
          <View style={styles.footerWrap}>
            <View style={styles.footerLine} />
            <Text style={styles.footerTxt}>DermaLink v1.0</Text>
            <Text style={styles.footerTeam}>Made by Team Jarbes</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },

  /* ═══ HERO ═══════════════════════════════════════════ */
  heroBg: { paddingBottom: 50, overflow: 'hidden' },
  orbWrap: { position: 'absolute', width: '100%', height: '100%' },
  orbBlue: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(59,130,246,0.15)', top: -40, right: -50,
  },
  orbGreen: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(16,185,129,0.12)', top: 80, left: -60,
  },
  orbViolet: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(139,92,246,0.1)', bottom: 20, right: 30,
  },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },

  /* Logo icon */
  logoIcon: {
    width: 80, height: 80, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  brandName: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
  brandAccent: { color: '#60a5fa' },

  /* AI badge */
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    marginTop: 14, marginBottom: 14,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  aiBadgeText: { fontSize: 12, fontWeight: '700', color: '#6ee7b7' },
  heroDesc: {
    fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row', width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingVertical: 14,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },

  /* ═══ BODY ═══════════════════════════════════════════ */
  body: { backgroundColor: colors.slate50, paddingHorizontal: 20, paddingBottom: 40 },
  curveClip: {
    position: 'absolute', top: -28, left: 0, right: 0, height: 30,
    backgroundColor: colors.slate50, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },

  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16 },
  secDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  secTitle: { fontSize: 18, fontWeight: '900', color: colors.slate900, letterSpacing: -0.3 },

  /* ═══ PORTALS ═══════════════════════════════════════ */
  portal: {
    borderRadius: 24, padding: 22, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  pOrb: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  pHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  pIcon: {
    width: 52, height: 52, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  pInfo: { flex: 1 },
  pLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 2 },
  pTitle: { fontSize: 19, fontWeight: '900', color: '#fff' },
  pArr: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  pDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19, marginBottom: 14 },
  pFeats: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 16, padding: 12 },
  pFeat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pFeatDot: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  pFeatTxt: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  /* ═══ FEATURES ═════════════════════════════════════ */
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  featCard: {
    width: (width - 52) / 2, backgroundColor: colors.white, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: colors.slate100,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  featIco: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featTitle: { fontSize: 14, fontWeight: '800', color: colors.slate800, marginBottom: 4 },
  featDesc: { fontSize: 11, color: colors.slate400, lineHeight: 17 },

  /* ═══ STEPS ════════════════════════════════════════ */
  stepsCard: {
    backgroundColor: colors.white, borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: colors.slate100,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3, marginBottom: 24,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: colors.slate800 },
  stepDesc: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  stepLine: { width: 2, height: 16, backgroundColor: colors.slate100, marginLeft: 21, marginVertical: 4, borderRadius: 1 },

  /* ═══ CTA ══════════════════════════════════════════ */
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 18, paddingVertical: 17,
    shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  ctaTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  altRow: { alignItems: 'center', marginTop: 16, marginBottom: 8 },
  altTxt: { fontSize: 14, color: colors.slate500 },
  altLink: { color: colors.primary, fontWeight: '700' },

  /* ═══ FOOTER ═══════════════════════════════════════ */
  footerWrap: { alignItems: 'center', marginTop: 20 },
  footerLine: { width: 40, height: 3, borderRadius: 2, backgroundColor: colors.slate200, marginBottom: 14 },
  footerTxt: { fontSize: 12, fontWeight: '700', color: colors.slate400 },
  footerTeam: { fontSize: 11, color: colors.slate300, marginTop: 3 },
});
