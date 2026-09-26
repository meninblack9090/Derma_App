import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/patient/HomeScreen';
import ScanScreen from '../screens/patient/ScanScreen';
import ConsultationScreen from '../screens/patient/ConsultationScreen';
import PatientPrescriptionScreen from '../screens/patient/PrescriptionScreen';
import PatientMessagesScreen from '../screens/patient/MessagesScreen';
import SkinReportScreen from '../screens/patient/SkinReportScreen';
import SettingsScreen from '../screens/patient/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function PatientTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.slate100,
          borderTopWidth: 1,
          height: 64 + Math.max(insets.bottom, 16),
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Scan: focused ? 'scan-circle' : 'scan-circle-outline',
            Consult: focused ? 'people' : 'people-outline',
            Prescriptions: focused ? 'document-text' : 'document-text-outline',
            Messages: focused ? 'chatbubble' : 'chatbubble-outline',
            Reports: focused ? 'bar-chart' : 'bar-chart-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Consult" component={ConsultationScreen} />
      <Tab.Screen name="Prescriptions" component={PatientPrescriptionScreen} />
      <Tab.Screen name="Messages" component={PatientMessagesScreen} />
      <Tab.Screen name="Reports" component={SkinReportScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
