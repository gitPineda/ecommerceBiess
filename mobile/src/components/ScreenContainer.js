import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../theme';

export default function ScreenContainer({
  children,
  scroll = false,
  style,
  contentContainerStyle,
  ...scrollProps
}) {
  const styles = useThemedStyles(createStyles);

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
      <View style={[styles.body, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, spacing }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
  });
