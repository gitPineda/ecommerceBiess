import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import LogoMark from '../components/LogoMark';
import ScreenContainer from '../components/ScreenContainer';
import { useAppStore } from '../store/AppStore';
import { useAppTheme, useThemedStyles } from '../theme';

export default function SplashScreen() {
  const { colors } = useAppTheme();
  const { company } = useAppStore();
  const styles = useThemedStyles(createStyles);

  return (
    <ScreenContainer style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <LogoMark size="lg" stacked subtitle={company?.welcomeMessage} />
      <View style={styles.copyBlock}>
        <Text style={styles.title}>{company?.welcomeTitle}</Text>
        <Text style={styles.subtitle}>Cargando recursos, estado global y configuracion de marca...</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} />
    </ScreenContainer>
  );
}

const createStyles = ({ colors, spacing, typography }) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxl,
    },
    orbTop: {
      position: 'absolute',
      top: 80,
      left: -20,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.primarySoft,
    },
    orbBottom: {
      position: 'absolute',
      bottom: 90,
      right: -10,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.neutralSoft,
    },
    copyBlock: {
      gap: spacing.sm,
      alignItems: 'center',
    },
    title: {
      ...typography.display,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: colors.muted,
      textAlign: 'center',
      paddingHorizontal: spacing.xxl,
    },
  });
