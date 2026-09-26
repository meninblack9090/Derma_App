import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { logOut } from '../../firebase/auth';
import { updateUserProfile } from '../../firebase/firestore';
import ProfileAvatar from '../../components/ProfileAvatar';

export default function SettingsScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [pushNotif, setPushNotif] = useState(true);
  const [scanReminders, setScanReminders] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [shareData, setShareData] = useState(true);

  // Edit profile
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditProfile = () => {
    setEditName(profile?.displayName ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: editName.trim(),
        phone: editPhone.trim(),
      });
      setEditVisible(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const profileStats = [
    { label: 'Total Scans', value: profile?.totalScans ?? 0 },
    { label: 'Plan', value: profile?.plan ?? 'Free' },
    { label: 'Consults', value: profile?.totalConsults ?? 0 },
  ];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('Help')}>
          <Ionicons name="help-circle-outline" size={22} color={colors.slate600} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.profileCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileTop}>
            <ProfileAvatar
              gender={profile?.gender}
              role="patient"
              size={56}
              seed={user?.uid}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.displayName ?? '—'}</Text>
              <Text style={styles.profilePlan}>{profile?.plan ?? 'Free'} Member</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEditProfile}>
              <Ionicons name="pencil-outline" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.profilePlanRow}>
            <View style={styles.planBarBg}>
              <View style={[styles.planBarFill, { width: `${profile?.points ?? 0}%` }]} />
            </View>
            <Text style={styles.planPoints}>{profile?.points ?? 0} pts</Text>
          </View>
          <View style={styles.profileStats}>
            {profileStats.map((s) => (
              <View key={s.label} style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{s.value}</Text>
                <Text style={styles.profileStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Personal Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Personal Info</Text>
          {[
            { icon: 'person-outline', label: 'Full Name', value: profile?.displayName ?? '—' },
            { icon: 'mail-outline', label: 'Email Address', value: user?.email ?? '—' },
            { icon: 'call-outline', label: 'Phone Number', value: profile?.phone ?? '—' },
            { icon: 'language-outline', label: 'Language', value: 'English (US)' },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, i < arr.length - 1 && styles.settingRowBorder]}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={item.icon} size={16} color={colors.slate500} />
                </View>
                <View>
                  <Text style={styles.settingSubLabel}>{item.label}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.slate300} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Account actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Account</Text>
          {[
            { icon: 'card-outline', label: 'Subscription', sub: 'Manage your plan', color: colors.primary, nav: 'Subscription' },
            { icon: 'help-circle-outline', label: 'Help & Support', sub: 'FAQs and contact', color: colors.teal, nav: 'Help' },
            { icon: 'document-text-outline', label: 'Privacy Policy', sub: 'Terms and conditions', color: colors.slate600 },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, i < arr.length - 1 && styles.settingRowBorder]}
              onPress={() => item.nav && navigation.navigate(item.nav)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <View>
                  <Text style={styles.settingValue}>{item.label}</Text>
                  <Text style={styles.settingSubValue}>{item.sub}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.slate300} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>DermaLink v1.0.0 · SDK 55</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              <TouchableOpacity style={styles.editCloseBtn} onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={18} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.editLabel}>Full Name</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor={colors.slate300}
            />

            <Text style={styles.editLabel}>Phone Number</Text>
            <TextInput
              style={styles.editInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. +63 912 345 6789"
              placeholderTextColor={colors.slate300}
              keyboardType="phone-pad"
            />

            <Text style={styles.editLabel}>Email</Text>
            <View style={[styles.editInput, { backgroundColor: colors.slate100 }]}>
              <Text style={{ fontSize: 14, color: colors.slate400 }}>{user?.email ?? '—'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text style={styles.editSaveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  helpBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  profileCard: { borderRadius: 24, padding: 20, marginBottom: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 17, fontWeight: '800', color: colors.white },
  profilePlan: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  planBarBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  planBarFill: { height: 5, borderRadius: 3, backgroundColor: colors.white },
  planPoints: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around' },
  profileStat: { alignItems: 'center' },
  profileStatValue: { fontSize: 18, fontWeight: '800', color: colors.white },
  profileStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.slate50 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingSubLabel: { fontSize: 10, color: colors.slate400, marginBottom: 1 },
  settingValue: { fontSize: 13, fontWeight: '600', color: colors.slate800 },
  settingSubValue: { fontSize: 11, color: colors.slate400, marginTop: 1 },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.red },

  versionText: { textAlign: 'center', fontSize: 11, color: colors.slate400 },

  // Edit profile modal
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  editTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  editCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  editLabel: { fontSize: 12, fontWeight: '700', color: colors.slate500, marginBottom: 6, marginTop: 12 },
  editInput: {
    backgroundColor: colors.slate50, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.slate200, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.slate800,
  },
  editSaveBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  editSaveText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
