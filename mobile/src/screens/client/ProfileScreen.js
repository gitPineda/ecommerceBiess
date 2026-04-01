import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LogoMark from '../../components/LogoMark';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { formatCurrency } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

export default function ProfileScreen() {
  const { user, signOut, lastOrder } = useAppStore();

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <LogoMark />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>@{user?.username}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>Rol: {user?.role}</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>Perfil de usuario</Text>
        <Text style={styles.description}>
          Pantalla simulada lista para crecer con historial real, direcciones y preferencias.
        </Text>
        <Text style={styles.meta}>Marca: {brand.appName}</Text>
        <Text style={styles.meta}>Soporte: {brand.supportEmail}</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>Ultimo pedido</Text>
        {lastOrder ? (
          <>
            <Text style={styles.meta}>Codigo: {lastOrder.id}</Text>
            <Text style={styles.meta}>Estado: {lastOrder.status}</Text>
            <Text style={styles.meta}>Pago: {lastOrder.paymentMethod}</Text>
            <Text style={styles.meta}>Total: {formatCurrency(lastOrder.total)}</Text>
          </>
        ) : (
          <Text style={styles.description}>Aun no has completado pedidos en esta sesion.</Text>
        )}
      </View>

      <PrimaryButton title="Cerrar sesion" tone="secondary" onPress={signOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  name: {
    ...typography.title,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.muted,
  },
  meta: {
    ...typography.body,
    color: colors.muted,
  },
});
