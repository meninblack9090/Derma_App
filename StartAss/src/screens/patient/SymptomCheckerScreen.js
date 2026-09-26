import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { symptomQuestions } from '../../data/constants';

export default function SymptomCheckerScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  const currentQ = symptomQuestions[step];
  const progress = (step / symptomQuestions.length) * 100;

  const handleAnswer = (option) => {
    const newAnswers = { ...answers, [currentQ.id]: option };
    setAnswers(newAnswers);

    if (step < symptomQuestions.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  const getResult = () => {
    const opts = Object.values(answers);
    const hasSevere = opts.includes('Very Severe') || opts.includes('Painful cysts') || opts.includes('Over 1 year');
    const hasModerate = opts.includes('Severe') || opts.includes('Mixed') || opts.includes('Full Face');
    if (hasSevere) return { grade: 4, label: 'Severe', color: colors.red, emoji: '🔴', rec: 'Immediate dermatologist consultation recommended. Oral medication may be required.' };
    if (hasModerate) return { grade: 3, label: 'Moderate', color: colors.amber, emoji: '🟠', rec: 'Topical prescription treatment recommended. Book a consultation.' };
    return { grade: 2, label: 'Mild', color: colors.primary, emoji: '🔵', rec: 'Over-the-counter treatments may help. Monitor skin regularly.' };
  };

  if (done) {
    const result = getResult();
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setDone(false); setStep(0); setAnswers({}); }}>
            <Ionicons name="arrow-back" size={20} color={colors.slate700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Assessment</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.resultContainer}>
          <View style={[styles.resultCard, { backgroundColor: result.color + '18' }]}>
            <Text style={styles.resultEmoji}>{result.emoji}</Text>
            <Text style={[styles.resultGrade, { color: result.color }]}>IGA Grade {result.grade}</Text>
            <Text style={[styles.resultLabel, { color: result.color }]}>{result.label} Acne</Text>
          </View>

          <View style={styles.recCard}>
            <View style={styles.recHeader}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.recTitle}>AI Recommendation</Text>
            </View>
            <Text style={styles.recText}>{result.rec}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Responses</Text>
            {symptomQuestions.map((q) => (
              <View key={q.id} style={styles.summaryItem}>
                <Text style={styles.summaryQ}>{q.question}</Text>
                <Text style={styles.summaryA}>{answers[q.id] || '—'}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => { setDone(false); setStep(0); setAnswers({}); navigation.navigate('Scan'); }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.scanBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="scan-outline" size={18} color={colors.white} />
              <Text style={styles.scanBtnText}>Get AI Scan Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.consultBtn} onPress={() => navigation.navigate('PatientApp', { screen: 'Consult' })}>
            <Ionicons name="people-outline" size={18} color={colors.teal} />
            <Text style={styles.consultBtnText}>Book Consultation</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.slate700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Symptom Checker</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{step + 1}/{symptomQuestions.length}</Text>
        </View>
      </View>

      <View style={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={[styles.progressFill, { width: `${progress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
        </View>

        {/* AI badge */}
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.aiBadgeText}>AI-Powered Symptom Analysis</Text>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNum}>Question {step + 1}</Text>
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {currentQ.options.map((option) => {
            const isSelected = answers[currentQ.id] === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                onPress={() => handleAnswer(option)}
              >
                <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                  {isSelected && <View style={styles.optionRadioInner} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={() => handleAnswer('—')}>
          <Text style={styles.skipText}>Skip this question</Text>
        </TouchableOpacity>
      </View>
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
  stepBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stepText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  progressWrap: { marginBottom: 20 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: colors.slate100, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, color: colors.slate400, textAlign: 'right' },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  aiBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  questionCard: {
    backgroundColor: colors.slate50,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
  },
  questionNum: { fontSize: 11, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  questionText: { fontSize: 17, fontWeight: '700', color: colors.slate900, lineHeight: 24 },

  optionsList: { gap: 10, marginBottom: 20 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.slate50,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  optionBtnSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: { borderColor: colors.primary },
  optionRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.slate700 },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '700' },

  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 13, color: colors.slate400 },

  // Result styles
  resultContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  resultCard: {
    alignItems: 'center',
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
  },
  resultEmoji: { fontSize: 56, marginBottom: 10 },
  resultGrade: { fontSize: 26, fontWeight: '900', marginBottom: 4 },
  resultLabel: { fontSize: 16, fontWeight: '700' },

  recCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  recText: { fontSize: 13, color: colors.slate700, lineHeight: 20 },

  summaryCard: {
    backgroundColor: colors.slate50,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },
  summaryItem: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  summaryQ: { fontSize: 11, color: colors.slate400, marginBottom: 2 },
  summaryA: { fontSize: 13, fontWeight: '600', color: colors.slate700 },

  scanBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  scanBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  consultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.tealLight,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.tealMid,
  },
  consultBtnText: { fontSize: 14, fontWeight: '700', color: colors.teal },
});
