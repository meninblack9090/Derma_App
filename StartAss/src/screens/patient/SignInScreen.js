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
import { signInUser } from '../../firebase/auth';

export default function PatientSignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) { setError('Please enter email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signInUser(email.trim(), password);
      // Navigation is handled automatically by auth state change in RootNavigator
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
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.slate700} />
          </TouchableOpacity>

          {/* Top badge */}
          <View style={styles.badgeRow}>
            <View style={styles.iconBox}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.badgeLabel}>Patient Portal</Text>
              <Text style={styles.badgeSub}>DermaLink</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome Back 👋</Text>
          <Text style={styles.subtitle}>Sign in to continue your skin health journey</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.slate400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="your@email.com"
                  placeholderTextColor={colors.slate300}
                />
              </View>
            </View>

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
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: colors.red, fontSize: 12 }}>{error}</Text>
            </View>
          )}

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.signInGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.signInText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>or continue with</Text>
            <View style={styles.divLine} />
          </View>

          {/* Social */}
          <View style={styles.socialRow}>
            {[
              { icon: 'logo-google', label: 'Google' },
              { icon: 'logo-apple', label: 'Apple' },
            ].map((s) => (
              <TouchableOpacity key={s.label} style={styles.socialBtn}>
                <Ionicons name={s.icon} size={20} color={colors.slate700} />
                <Text style={styles.socialText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.signupRow}
            onPress={() => navigation.navigate('PatientSignUp')}
          >
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupLink}>Create one →</Text>
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
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  badgeSub: { fontSize: 12, color: colors.primary },

  title: { fontSize: 28, fontWeight: '800', color: colors.slate900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.slate500, marginBottom: 28, lineHeight: 20 },

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


  signInBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  signInGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signInText: { fontSize: 16, fontWeight: '700', color: colors.white },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.slate200 },
  divText: { fontSize: 12, color: colors.slate400 },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.slate50,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  socialText: { fontSize: 14, fontWeight: '600', color: colors.slate700 },

  signupRow: { alignItems: 'center' },
  signupText: { fontSize: 14, color: colors.slate500 },
  signupLink: { color: colors.primary, fontWeight: '700' },
});
