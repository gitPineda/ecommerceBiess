import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { isAdminRole } from '../config/roles';
import SplashScreen from '../screens/SplashScreen';
import { useAppStore } from '../store/AppStore';
import { useAppTheme } from '../theme';
import AdminNavigator from './AdminNavigator';
import AuthNavigator from './AuthNavigator';
import ClientNavigator from './ClientNavigator';
import SellerNavigator from './SellerNavigator';

export default function AppNavigator() {
  const { state, user } = useAppStore();
  const { navigationTheme } = useAppTheme();

  if (state.isBootstrapping) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {!user ? (
        <AuthNavigator />
      ) : isAdminRole(user.role) ? (
        <AdminNavigator />
      ) : user.role === 'seller' ? (
        <SellerNavigator />
      ) : (
        <ClientNavigator />
      )}
    </NavigationContainer>
  );
}
