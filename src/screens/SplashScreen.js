import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import brand from '../config/brand.json';
import LogoMark from '../components/LogoMark';
import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing, typography } from '../theme';

export default function SplashScreen() {
  return (
    <ScreenContainer style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <LogoMark size="lg" stacked subtitle={brand.welcomeMessage} />
      <View style={styles.copyBlock}>
        <Text style={styles.title}>{brand.welcomeTitle}</Text>
        <Text style={styles.subtitle}>Cargando recursos, estado global y configuracion de marca...</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#D6F0EB',
  },
  orbBottom: {
    position: 'absolute',
    bottom: 90,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FEE4D2',
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
