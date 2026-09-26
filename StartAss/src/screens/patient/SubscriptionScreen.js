import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    color: colors.slate700,
    gradient: [colors.slate100, colors.white],
    features: [
      { label: '3 AI scans per month', included: true },
      { label: 'Basic skin score', included: true },
      { label: 'Report history (7 days)', included: true },
      { label: 'Community support', included: true },
      { label: 'Priority dermatologist access', included: false },
      { label: 'Unlimited AI scans', included: false },
      { label: 'Detailed analytics', included: false },
      { label: 'Personalized treatment plans', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: '/month',
    color: colors.white,
    gradient: [colors.primary, colors.primaryDark],
    badge: 'Most Popular',
    features: [
      { label: 'Unlimited AI scans', included: true },
      { label: 'Advanced skin analytics', included: true },
      { label: 'Full report history', included: true },
      { label: 'Priority dermatologist access', included: true },
      { label: 'Personalized treatment plans', included: true },
      { label: 'Monthly progress reports', included: true },
      { label: 'Video consultation discounts', included: true },
      { label: 'Early access to new features', included: true },
    ],
  },
];

const testimonials = [
  { name: 'Maria S.', text: 'My skin improved dramatically in 2 months!', rating: 5, avatar: '👩' },
  { name: 'Alex J.', text: 'The AI scans are incredibly accurate.', rating: 5, avatar: '🧑' },
];

export default function SubscriptionScreen({ navigation }) {
  const [selected, setSelected] = useState('premium');
  const [billing, setBilling] = useState('monthly');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.slate700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="star" size={28} color="#f59e0b" />
          </View>
          <Text style={styles.heroTitle}>Upgrade Your Skin Care</Text>
          <Text style={styles.heroSub}>
            Get unlimited access to AI-powered skin analysis and expert dermatologist care
          </Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.billingToggle}>
          {['monthly', 'yearly'].map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.billingBtn, billing === b && styles.billingBtnActive]}
              onPress={() => setBilling(b)}
            >
              <Text style={[styles.billingBtnText, billing === b && styles.billingBtnTextActive]}>
                {b === 'monthly' ? 'Monthly' : 'Yearly  (Save 20%)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Plan cards */}
        <View style={styles.plansRow}>
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            const isPremium = plan.id === 'premium';
            const displayPrice = billing === 'yearly' && isPremium ? '$7.99' : plan.price;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelected(plan.id)}
              >
                {isPremium ? (
                  <LinearGradient
                    colors={plan.gradient}
                    style={styles.planGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {plan.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={[styles.planName, { color: colors.white }]}>{plan.name}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planPrice, { color: colors.white }]}>{displayPrice}</Text>
                      <Text style={[styles.planPeriod, { color: 'rgba(255,255,255,0.7)' }]}>{plan.period}</Text>
                    </View>
                    {plan.features.map((f) => (
                      <View key={f.label} style={styles.featureRow}>
                        <Ionicons
                          name={f.included ? 'checkmark-circle' : 'close-circle'}
                          size={14}
                          color={f.included ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}
                        />
                        <Text
                          style={[
                            styles.featureText,
                            { color: f.included ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' },
                          ]}
                        >
                          {f.label}
                        </Text>
                      </View>
                    ))}
                  </LinearGradient>
                ) : (
                  <View style={styles.planInner}>
                    <Text style={[styles.planName, { color: colors.slate700 }]}>{plan.name}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planPrice, { color: colors.slate800 }]}>{plan.price}</Text>
                      <Text style={[styles.planPeriod, { color: colors.slate400 }]}>{plan.period}</Text>
                    </View>
                    {plan.features.map((f) => (
                      <View key={f.label} style={styles.featureRow}>
                        <Ionicons
                          name={f.included ? 'checkmark-circle' : 'close-circle'}
                          size={14}
                          color={f.included ? colors.emerald : colors.slate300}
                        />
                        <Text
                          style={[
                            styles.featureText,
                            { color: f.included ? colors.slate700 : colors.slate300 },
                          ]}
                        >
                          {f.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Testimonials */}
        <Text style={styles.sectionTitle}>What patients say</Text>
        <View style={styles.testimonialsList}>
          {testimonials.map((t) => (
            <View key={t.name} style={styles.testimonialCard}>
              <View style={styles.testimonialTop}>
                <Text style={styles.testimonialAvatar}>{t.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <View style={styles.starsRow}>
                    {Array(t.rating).fill(0).map((_, i) => (
                      <Ionicons key={i} name="star" size={11} color="#f59e0b" />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.testimonialText}>"{t.text}"</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaBtn}>
          <LinearGradient
            colors={selected === 'premium' ? [colors.primary, colors.primaryDark] : [colors.slate500, colors.slate700]}
            style={styles.ctaGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="star" size={18} color={colors.white} />
            <Text style={styles.ctaText}>
              {selected === 'premium' ? 'Get Premium' : 'Continue Free'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Cancel anytime · No hidden fees · HIPAA compliant</Text>
      </ScrollView>
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

  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.slate900, textAlign: 'center', marginBottom: 8 },
  heroSub: { fontSize: 13, color: colors.slate500, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  billingBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  billingBtnActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  billingBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate500 },
  billingBtnTextActive: { color: colors.slate900 },

  plansRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  planCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: { borderColor: colors.primary },
  planGrad: { padding: 16 },
  planInner: { padding: 16, backgroundColor: colors.slate50 },
  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  planBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  planName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 12 },
  planPrice: { fontSize: 26, fontWeight: '900' },
  planPeriod: { fontSize: 12, marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  featureText: { fontSize: 11, flex: 1 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 12 },

  testimonialsList: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  testimonialCard: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  testimonialTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  testimonialAvatar: { fontSize: 24 },
  testimonialName: { fontSize: 12, fontWeight: '700', color: colors.slate800 },
  starsRow: { flexDirection: 'row', gap: 1, marginTop: 2 },
  testimonialText: { fontSize: 11, color: colors.slate600, lineHeight: 16, fontStyle: 'italic' },

  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: colors.white },

  disclaimer: { textAlign: 'center', fontSize: 11, color: colors.slate400 },
});
