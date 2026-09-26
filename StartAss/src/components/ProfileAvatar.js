import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Color palettes per gender / role ──────────────────────────────────────
const PALETTES = {
  male_patient: [
    { bg: '#dbeafe', accent: '#3b82f6', icon: '#1d4ed8', emoji: '👨' },
    { bg: '#e0f2fe', accent: '#0ea5e9', icon: '#0369a1', emoji: '🧑' },
    { bg: '#ede9fe', accent: '#8b5cf6', icon: '#6d28d9', emoji: '👦' },
    { bg: '#d1fae5', accent: '#10b981', icon: '#047857', emoji: '🙂' },
  ],
  female_patient: [
    { bg: '#fce7f3', accent: '#ec4899', icon: '#be185d', emoji: '👩' },
    { bg: '#fae8ff', accent: '#d946ef', icon: '#a21caf', emoji: '🧑‍🦰' },
    { bg: '#ffe4e6', accent: '#f43f5e', icon: '#be123c', emoji: '👧' },
    { bg: '#fef3c7', accent: '#f59e0b', icon: '#b45309', emoji: '😊' },
  ],
  male_derma: [
    { bg: '#ccfbf1', accent: '#14b8a6', icon: '#0f766e', emoji: '👨‍⚕️' },
    { bg: '#cffafe', accent: '#06b6d4', icon: '#0e7490', emoji: '🧑‍⚕️' },
    { bg: '#dbeafe', accent: '#3b82f6', icon: '#1d4ed8', emoji: '👨‍⚕️' },
    { bg: '#d1fae5', accent: '#10b981', icon: '#047857', emoji: '🩺' },
  ],
  female_derma: [
    { bg: '#fce7f3', accent: '#ec4899', icon: '#be185d', emoji: '👩‍⚕️' },
    { bg: '#f5d0fe', accent: '#d946ef', icon: '#a21caf', emoji: '👩‍⚕️' },
    { bg: '#ffe4e6', accent: '#f43f5e', icon: '#be123c', emoji: '🧑‍⚕️' },
    { bg: '#fbcfe8', accent: '#ec4899', icon: '#9d174d', emoji: '💊' },
  ],
};

// ─── Shape variants for visual variety ─────────────────────────────────────
const SHAPES = [
  { borderRadius: (s) => s / 2 },       // circle
  { borderRadius: (s) => s * 0.3 },      // squircle
  { borderRadius: (s) => s * 0.22 },     // rounded square
  { borderRadius: (s) => s * 0.38 },     // soft circle
];

const DECORATIONS = [
  'star',
  'dots',
  'ring',
  'badge',
];

export default function ProfileAvatar({ gender, role, size = 56, seed }) {
  const config = useMemo(() => {
    const key = `${gender || 'male'}_${role || 'patient'}`;
    const palette = PALETTES[key] || PALETTES.male_patient;

    // Use seed (uid hash) for consistent random per user
    const hash = seed ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : Math.floor(Math.random() * 1000);
    const pIdx = hash % palette.length;
    const sIdx = (hash + 3) % SHAPES.length;
    const dIdx = (hash + 7) % DECORATIONS.length;

    return {
      ...palette[pIdx],
      shape: SHAPES[sIdx],
      deco: DECORATIONS[dIdx],
    };
  }, [gender, role, seed]);

  const radius = config.shape.borderRadius(size);
  const isMale = (gender || 'male') === 'male';
  const isDerma = (role || 'patient') === 'derma';

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: config.bg }]}>
      {/* Decoration */}
      {config.deco === 'ring' && (
        <View style={[styles.decoRing, {
          width: size + 6, height: size + 6, borderRadius: radius + 3,
          borderColor: config.accent + '40',
        }]} />
      )}
      {config.deco === 'dots' && (
        <>
          <View style={[styles.decoDot, { backgroundColor: config.accent + '30', top: 4, right: 6 }]} />
          <View style={[styles.decoDot, { backgroundColor: config.accent + '20', bottom: 6, left: 5, width: 6, height: 6 }]} />
        </>
      )}
      {config.deco === 'star' && (
        <View style={[styles.decoStar, { top: 2, right: 3 }]}>
          <Text style={{ fontSize: size * 0.18, opacity: 0.5 }}>✦</Text>
        </View>
      )}
      {config.deco === 'badge' && isDerma && (
        <View style={[styles.decoBadge, { backgroundColor: config.accent }]}>
          <Ionicons name="checkmark" size={size * 0.14} color="#fff" />
        </View>
      )}

      {/* Main icon/emoji */}
      <View style={styles.emojiWrap}>
        <Text style={{ fontSize: size * 0.42 }}>
          {isDerma
            ? (isMale ? '👨‍⚕️' : '👩‍⚕️')
            : (isMale ? '👨' : '👩')
          }
        </Text>
      </View>

      {/* Bottom accent bar */}
      <View style={[styles.accentBar, {
        backgroundColor: config.accent + '35',
        width: size * 0.5,
        borderRadius: 3,
        bottom: size * 0.08,
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  emojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  decoRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  decoDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  decoStar: {
    position: 'absolute',
  },
  decoBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  accentBar: {
    position: 'absolute',
    height: 3,
  },
});
