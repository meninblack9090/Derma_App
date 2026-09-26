import React from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { logOut } from '../firebase/auth';

import LandingScreen from '../screens/LandingScreen';
import PatientSignInScreen from '../screens/patient/SignInScreen';
import PatientSignUpScreen from '../screens/patient/SignUpScreen';
import PatientTabNavigator from './PatientTabNavigator';
import ResultScreen from '../screens/patient/ResultScreen';
import ValidationScreen from '../screens/patient/ValidationScreen';
import SubscriptionScreen from '../screens/patient/SubscriptionScreen';
import SymptomCheckerScreen from '../screens/patient/SymptomCheckerScreen';
import HelpScreen from '../screens/patient/HelpScreen';
import DermaSignInScreen from '../screens/derma/SignInScreen';
import DermaSignUpScreen from '../screens/derma/SignUpScreen';
import DermaTabNavigator from './DermaTabNavigator';

const Stack = createStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function ProfileErrorScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#e11d48', textAlign: 'center' }}>
        Profile Not Found
      </Text>
      <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
        We couldn't load your account profile. This may be due to a network issue or missing account data. Please try signing in again.
      </Text>
      <TouchableOpacity
        onPress={() => logOut()}
        style={{
          backgroundColor: colors.primary || '#3b82f6',
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootNavigator() {
  const { user, profile, authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;

  // ─── Not logged in → show auth screens ────────────────────────────────────
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="PatientSignIn" component={PatientSignInScreen} />
        <Stack.Screen name="PatientSignUp" component={PatientSignUpScreen} />
        <Stack.Screen name="DermaSignIn" component={DermaSignInScreen} />
        <Stack.Screen name="DermaSignUp" component={DermaSignUpScreen} />
      </Stack.Navigator>
    );
  }

  // ─── Patient app ───────────────────────────────────────────────────────────
  if (profile?.role === 'patient') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PatientApp" component={PatientTabNavigator} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Validation" component={ValidationScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
      </Stack.Navigator>
    );
  }

  // ─── Derma app ─────────────────────────────────────────────────────────────
  if (profile?.role === 'derma') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DermaApp" component={DermaTabNavigator} />
      </Stack.Navigator>
    );
  }

  // Profile is missing or has an unrecognized role — show error with sign-out option
  return <ProfileErrorScreen />;
}
