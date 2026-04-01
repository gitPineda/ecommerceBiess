import React from 'react';
import { AppStoreProvider } from './src/store/AppStore';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppStoreProvider>
      <AppNavigator />
    </AppStoreProvider>
  );
}
