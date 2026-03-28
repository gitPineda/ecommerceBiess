import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import brand from '../config/brand.json';
import SplashScreen from '../screens/SplashScreen';
import { useAppStore } from '../store/AppStore';
import AdminNavigator from './AdminNavigator';
import AuthNavigator from './AuthNavigator';
import ClientNavigator from './ClientNavigator';
import { navigationTheme } from './navigationTheme';

export default function AppNavigator() {
  const { state, user } = useAppStore();

  if (state.isBootstrapping) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {!user ? (
        <AuthNavigator />
      ) : user.role === brand.roles.admin ? (
        <AdminNavigator />
      ) : (
        <ClientNavigator />
      )}
    </NavigationContainer>
  );
}
