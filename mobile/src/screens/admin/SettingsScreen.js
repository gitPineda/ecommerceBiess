import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LogoMark from '../../components/LogoMark';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { envConfig } from '../../config/env';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

export default function SettingsScreen() {
  const { signOut, user } = useAppStore();

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <LogoMark />
        <Text style={styles.title}>Configuracion white-label</Text>
        <Text style={styles.text}>Marca: {brand.appName}</Text>
        <Text style={styles.text}>Slug: {brand.slug}</Text>
        <Text style={styles.text}>Correo de soporte: {brand.supportEmail}</Text>
        <Text style={styles.text}>Sesion actual: {user?.name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Integraciones futuras</Text>
        <Text style={styles.text}>Fuente de datos activa: {envConfig.dataSource}</Text>
        <Text style={styles.text}>API base: {envConfig.apiBaseUrl}</Text>
        <Text style={styles.text}>Supabase URL: pendiente</Text>
        <Text style={styles.text}>Supabase Key: pendiente</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Paleta central</Text>
        <View style={styles.swatchRow}>
          <View style={[styles.swatch, { backgroundColor: brand.palette.primary }]} />
          <View style={[styles.swatch, { backgroundColor: brand.palette.secondary }]} />
          <View style={[styles.swatch, { backgroundColor: brand.palette.accent }]} />
          <View style={[styles.swatch, { backgroundColor: brand.palette.surfaceAlt }]} />
        </View>
        <Text style={styles.text}>
          Cambia `src/config/brand.json` y `src/theme/*` para renombrar o recolorear la app.
        </Text>
      </View>

      <PrimaryButton title="Cerrar sesion" tone="danger" onPress={signOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  text: {
    ...typography.body,
    color: colors.muted,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
});
