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

export default function DermaSettingsScreen({ navigation }) {
  const { user, profile } = useAuth();

  const [darkMode, setDarkMode] = useState(false);

  // Edit profile
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditProfile = () => {
    setEditName(profile?.displayName ?? '');
    setEditSpecialty(profile?.specialty ?? '');
    setEditLicense(profile?.licenseNumber ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: editName.trim(),
        specialty: editSpecialty.trim(),
        licenseNumber: editLicense.trim(),
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logOut() },
      ]
    );
  };

  const menuItems = [
    {
      section: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', color: colors.primary, bg: colors.primaryLight, action: openEditProfile },
        { icon: 'shield-checkmark-outline', label: 'Verification & License', color: colors.teal, bg: colors.tealLight, action: () => {} },
      ],
    },
    {
      section: 'Preferences',
      items: [
        { icon: 'lock-closed-outline', label: 'Privacy & Security', color: colors.amber, bg: '#fffbeb', action: () => {} },
        { icon: 'help-circle-outline', label: 'Help & Support', color: colors.emerald, bg: colors.emeraldLight, action: () => {} },
        { icon: 'document-text-outline', label: 'Terms & Privacy Policy', color: colors.slate500, bg: colors.slate100, action: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        <LinearGradient
          colors={[colors.teal, colors.tealDark]}
          style={styles.profileCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarWrap}>
            <ProfileAvatar
              gender={profile?.gender}
              role="derma"
              size={72}
              seed={user?.uid}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.displayName ? `Dr. ${profile.displayName}` : 'Dr. —'}
            </Text>
            <Text style={styles.profileSpecialty}>{profile?.specialty ?? 'Dermatologist'}</Text>
            <View style={styles.profileBadge}>
              <Ionicons name="shield-checkmark" size={12} color={colors.teal} />
              <Text style={styles.profileBadgeText}>
                {profile?.licenseNumber ?? 'License pending'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Email display */}
        <View style={styles.emailRow}>
          <Ionicons name="mail-outline" size={16} color={colors.slate400} />
          <Text style={styles.emailText}>
            {user?.email ?? '—'}
          </Text>
        </View>

        {/* Menu sections */}
        {menuItems.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.section}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuRow,
                    idx < section.items.length - 1 && styles.menuRowBorder,
                  ]}
                  onPress={item.action}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.slate300} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.menuCard}>
            <View style={styles.toggleRow}>
              <View style={[styles.menuIcon, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="moon-outline" size={18} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Dark Mode</Text>
                <Text style={styles.toggleSub}>Switch to dark appearance</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.slate200, true: colors.tealLight }}
                thumbColor={darkMode ? colors.teal : colors.slate300}
              />
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DermaLink v1.0.0 • Dermatologist Portal</Text>
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

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.editLabel}>Full Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={colors.slate300}
              />

              <Text style={styles.editLabel}>Specialty</Text>
              <TextInput
                style={styles.editInput}
                value={editSpecialty}
                onChangeText={setEditSpecialty}
                placeholder="e.g. Dermatology, Cosmetic"
                placeholderTextColor={colors.slate300}
              />

              <Text style={styles.editLabel}>License Number</Text>
              <TextInput
                style={styles.editInput}
                value={editLicense}
                onChangeText={setEditLicense}
                placeholder="e.g. PRC-12345"
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.slate900 },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },

  profileCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    shadowColor: colors.tealDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: colors.white },
  profileSpecialty: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: 8 },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  profileBadgeText: { fontSize: 11, color: colors.white, fontWeight: '600' },

  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  emailText: { fontSize: 13, color: colors.slate500 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate400,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.slate700 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.slate700 },
  toggleSub: { fontSize: 11, color: colors.slate400, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    marginBottom: 20,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.red },

  version: { textAlign: 'center', fontSize: 11, color: colors.slate300 },

  // Edit profile modal
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
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
    backgroundColor: colors.teal, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 20,
  },
  editSaveText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
