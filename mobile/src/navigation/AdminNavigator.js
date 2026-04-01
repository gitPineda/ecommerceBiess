import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ProductManagementScreen from '../screens/admin/ProductManagementScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Resumen: 'grid-outline',
  Productos: 'cube-outline',
  Usuarios: 'people-outline',
  Ajustes: 'settings-outline',
};

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Resumen" component={AdminDashboardScreen} />
      <Tab.Screen name="Productos" component={ProductManagementScreen} />
      <Tab.Screen name="Usuarios" component={UserManagementScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
