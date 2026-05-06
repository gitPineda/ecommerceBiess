import React from 'react';
import { AppStoreProvider } from './src/store/AppStore';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme';

export default function App() {
  return (
    <ThemeProvider>
      <AppStoreProvider>
        <AppNavigator />
      </AppStoreProvider>
    </ThemeProvider>
  );
}
