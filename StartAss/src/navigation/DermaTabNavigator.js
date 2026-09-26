import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import DermaDashboardScreen from '../screens/derma/DashboardScreen';
import PatientsScreen from '../screens/derma/PatientsScreen';
import DermaPrescriptionScreen from '../screens/derma/PrescriptionScreen';
import MessagesScreen from '../screens/derma/MessagesScreen';
import AppointmentsScreen from '../screens/derma/AppointmentsScreen';
import DermaSettingsScreen from '../screens/derma/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function DermaTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
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
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Patients: focused ? 'person' : 'person-outline',
            Prescriptions: focused ? 'document-text' : 'document-text-outline',
            Messages: focused ? 'chatbubble' : 'chatbubble-outline',
            Appointments: focused ? 'calendar' : 'calendar-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DermaDashboardScreen} />
      <Tab.Screen name="Patients" component={PatientsScreen} />
      <Tab.Screen name="Prescriptions" component={DermaPrescriptionScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Profile" component={DermaSettingsScreen} />
    </Tab.Navigator>
  );
}
