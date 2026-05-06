import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import ProductManagementScreen from '../screens/admin/ProductManagementScreen';
import ProfileScreen from '../screens/client/ProfileScreen';
import SellerDashboardScreen from '../screens/seller/SellerDashboardScreen';
import SellerOrdersScreen from '../screens/seller/SellerOrdersScreen';
import SellerSalesScreen from '../screens/seller/SellerSalesScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Resumen: 'grid-outline',
  Pedidos: 'trail-sign-outline',
  Productos: 'cube-outline',
  Ventas: 'cash-outline',
  Perfil: 'person-circle-outline',
};

export default function SellerNavigator() {
  const { colors } = useAppTheme();

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
      <Tab.Screen name="Resumen" component={SellerDashboardScreen} />
      <Tab.Screen name="Pedidos" component={SellerOrdersScreen} />
      <Tab.Screen name="Productos" component={ProductManagementScreen} />
      <Tab.Screen name="Ventas" component={SellerSalesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
