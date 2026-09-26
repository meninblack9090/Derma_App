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
import { signUpPatient } from '../../firebase/auth';

export default function PatientSignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      await signUpPatient({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), gender });
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

          <View style={styles.badgeRow}>
            <View style={styles.iconBox}>
              <Ionicons name="person-add" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.badgeLabel}>New Patient</Text>
              <Text style={styles.badgeSub}>Join DermaLink</Text>
            </View>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your skin health journey today</Text>

          <View style={styles.form}>
            {[
              {
                label: 'Full Name',
                value: name,
                set: setName,
                icon: 'person-outline',
                placeholder: 'John Smith',
                keyboard: 'default',
              },
              {
                label: 'Email Address',
                value: email,
                set: setEmail,
                icon: 'mail-outline',
                placeholder: 'your@email.com',
                keyboard: 'email-address',
              },
              {
                label: 'Phone Number',
                value: phone,
                set: setPhone,
                icon: 'call-outline',
                placeholder: '09123456789',
                keyboard: 'phone-pad',
                maxLen: 11,
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
                    autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
                    maxLength={field.maxLen}
                  />
                </View>
              </View>
            ))}

            {/* Gender picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {['male', 'female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={g === 'male' ? 'male' : 'female'}
                      size={18}
                      color={gender === g ? '#fff' : colors.slate400}
                    />
                    <Text style={[styles.genderTxt, gender === g && styles.genderTxtActive]}>
                      {g === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Password field with its own toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.slate400} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.slate300}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.slate400} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm password field with its own toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.slate400} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showConfirm}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.slate300}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 4 }}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.slate400} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Terms */}
          <View style={styles.termsRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {!!error && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: colors.red, fontSize: 12 }}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.createGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.createText}>{loading ? 'Creating...' : 'Create Account'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signinRow}
            onPress={() => navigation.navigate('PatientSignIn')}
          >
            <Text style={styles.signinText}>
              Already have an account?{' '}
              <Text style={styles.signinLink}>Sign in →</Text>
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

  form: { gap: 14, marginBottom: 16 },
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
  input: { fontSize: 14, color: colors.slate800 },

  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.slate200,
    backgroundColor: colors.slate50,
  },
  genderBtnActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  genderTxt: { fontSize: 14, fontWeight: '600', color: colors.slate500 },
  genderTxtActive: { color: '#fff' },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  termsText: { flex: 1, fontSize: 12, color: colors.slate500, lineHeight: 18 },
  termsLink: { color: colors.primary, fontWeight: '600' },

  createBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  createGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  createText: { fontSize: 16, fontWeight: '700', color: colors.white },

  signinRow: { alignItems: 'center' },
  signinText: { fontSize: 14, color: colors.slate500 },
  signinLink: { color: colors.primary, fontWeight: '700' },
});
