import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { spacing } from './spacing';
import { typography } from './typography';
import { buildThemeColors, DEFAULT_THEME_ID, getThemeOption, themeOptions } from './themes';

const STORAGE_KEY = '@biess/theme';

const ThemeContext = createContext(null);

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

function buildShadows(colors) {
  return {
    card: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 4,
    },
  };
}

function buildNavigationTheme(colors, isDarkTheme) {
  const baseTheme = isDarkTheme ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    dark: isDarkTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTheme() {
      try {
        const savedThemeId = await AsyncStorage.getItem(STORAGE_KEY);

        if (isMounted && savedThemeId) {
          setThemeId(savedThemeId);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  async function selectTheme(nextThemeId) {
    if (!themeOptions.some((option) => option.id === nextThemeId)) {
      return;
    }

    setThemeId(nextThemeId);
    await AsyncStorage.setItem(STORAGE_KEY, nextThemeId);
  }

  const colors = buildThemeColors(themeId);
  const isDarkTheme = themeId === 'mono-orange';
  const shadows = buildShadows(colors);
  const navigationTheme = buildNavigationTheme(colors, isDarkTheme);
  const currentTheme = getThemeOption(themeId);

  if (!isReady) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        currentTheme,
        themeOptions,
        selectTheme,
        isDarkTheme,
        colors,
        spacing,
        typography,
        radius,
        shadows,
        navigationTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme debe usarse dentro de ThemeProvider.');
  }

  return context;
}

export function useThemedStyles(factory) {
  const theme = useAppTheme();
  return factory(theme);
}
