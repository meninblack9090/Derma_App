import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { signInDerma } from '../../firebase/auth';

export default function DermaSignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [license, setLicense] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) { setError('Please enter email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signInDerma(email.trim(), password);
      // Navigation handled by auth state change
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.slate700} />
          </TouchableOpacity>

          {/* Derma badge */}
          <View style={styles.badgeRow}>
            <View style={styles.iconBox}>
              <Ionicons name="medkit" size={24} color={colors.teal} />
            </View>
            <View>
              <Text style={styles.badgeLabel}>Dermatologist Portal</Text>
              <Text style={styles.badgeSub}>DermaLink for Professionals</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome, Doctor 👩‍⚕️</Text>
          <Text style={styles.subtitle}>Sign in to your professional dashboard</Text>

          {/* Teal accent line */}
          <View style={styles.accentLine} />

          <View style={styles.form}>
            {[
              {
                label: 'Email Address',
                value: email,
                set: setEmail,
                icon: 'mail-outline',
                keyboard: 'email-address',
                placeholder: 'doctor@email.com',
              },
              {
                label: 'Medical License No.',
                value: license,
                set: setLicense,
                icon: 'id-card-outline',
                placeholder: 'e.g. MD-2024-00123',
              },
            ].map((field) => (
              <View key={field.label} style={styles.inputGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name={field.icon} size={18} color={colors.slate400} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={field.value}
                    onChangeText={field.set}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.slate300}
                    keyboardType={field.keyboard || 'default'}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.slate400} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  placeholder="Enter password"
                  placeholderTextColor={colors.slate300}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.slate400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '600' }}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: colors.red, fontSize: 12 }}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.teal, colors.tealDark]}
              style={styles.signInGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="medkit" size={18} color={colors.white} />
              <Text style={styles.signInText}>{loading ? 'Signing in...' : 'Sign In to Portal'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Security note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.teal} />
            <Text style={styles.securityText}>
              Secured with medical-grade encryption · HIPAA compliant
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Professional Dashboard Includes</Text>
            {[
              'Patient scan validation queue',
              'Video consultation management',
              'AI-assisted diagnosis tools',
              'Schedule & appointment management',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.teal} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.signupRow}
            onPress={() => navigation.navigate('DermaSignUp')}
          >
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupLink}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.tealLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.tealMid,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.teal,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeLabel: { fontSize: 15, fontWeight: '800', color: colors.tealDark },
  badgeSub: { fontSize: 12, color: colors.teal },

  title: { fontSize: 28, fontWeight: '800', color: colors.slate900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.slate500, marginBottom: 20, lineHeight: 20 },

  accentLine: {
    height: 3,
    width: 40,
    backgroundColor: colors.teal,
    borderRadius: 2,
    marginBottom: 24,
  },

  form: { gap: 16, marginBottom: 8 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: colors.slate800 },


  signInBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  signInGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signInText: { fontSize: 16, fontWeight: '700', color: colors.white },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 20,
  },
  securityText: { fontSize: 11, color: colors.slate500 },

  featuresCard: {
    backgroundColor: colors.tealLight,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.tealMid,
    gap: 8,
  },
  featuresTitle: { fontSize: 13, fontWeight: '700', color: colors.tealDark, marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 12, color: colors.slate700 },

  signupRow: { alignItems: 'center', marginTop: 20 },
  signupText: { fontSize: 14, color: colors.slate500 },
  signupLink: { color: colors.teal, fontWeight: '700' },
});
