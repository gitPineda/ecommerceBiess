import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useAppStore } from '../store/AppStore';
import CartScreen from '../screens/client/CartScreen';
import CheckoutScreen from '../screens/client/CheckoutScreen';
import HomeScreen from '../screens/client/HomeScreen';
import OrderRatingScreen from '../screens/client/OrderRatingScreen';
import ProductDetailScreen from '../screens/client/ProductDetailScreen';
import ProfileScreen from '../screens/client/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Inicio: 'storefront-outline',
  Carrito: 'cart-outline',
  Perfil: 'person-circle-outline',
};

function buildStackOptions(colors, title) {
  return {
    title,
    headerStyle: {
      backgroundColor: colors.surface,
    },
    headerTintColor: colors.text,
    contentStyle: {
      backgroundColor: colors.background,
    },
  };
}

function HomeStackNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CatalogoLista"
        component={HomeScreen}
        options={buildStackOptions(colors, 'Productos')}
      />
      <Stack.Screen
        name="DetalleProducto"
        component={ProductDetailScreen}
        options={buildStackOptions(colors, 'Detalle')}
      />
    </Stack.Navigator>
  );
}

function CartStackNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CarritoLista"
        component={CartScreen}
        options={buildStackOptions(colors, 'Carrito')}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={buildStackOptions(colors, 'Pago')}
      />
      <Stack.Screen
        name="OrderRating"
        component={OrderRatingScreen}
        options={buildStackOptions(colors, 'Calificar')}
      />
    </Stack.Navigator>
  );
}

export default function ClientNavigator() {
  const { cartSummary } = useAppStore();
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeStackNavigator} />
      <Tab.Screen
        name="Carrito"
        component={CartStackNavigator}
        options={{
          tabBarBadge: cartSummary.itemCount ? cartSummary.itemCount : undefined,
        }}
      />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
