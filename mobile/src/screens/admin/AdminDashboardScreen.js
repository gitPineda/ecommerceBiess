import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LogoMark from '../../components/LogoMark';
import MenuCard from '../../components/MenuCard';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

export default function AdminDashboardScreen({ navigation }) {
  const { user, products, users, orders } = useAppStore();

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <LogoMark />
        <Text style={styles.heroTitle}>Panel administrador</Text>
        <Text style={styles.heroSubtitle}>
          {user?.name}, aqui controlas catalogo, usuarios y configuracion global de la app.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{products.length}</Text>
          <Text style={styles.metricLabel}>Productos</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{users.length}</Text>
          <Text style={styles.metricLabel}>Usuarios</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{orders.length}</Text>
          <Text style={styles.metricLabel}>Pedidos</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        <MenuCard
          icon="cube-outline"
          title="Ingreso de productos"
          description="Crea nuevos productos y actualiza el catalogo white-label."
          onPress={() => navigation.navigate('Productos')}
        />
        <MenuCard
          icon="people-outline"
          title="Ingreso de usuarios"
          description="Registra nuevos perfiles con rol admin o cliente."
          onPress={() => navigation.navigate('Usuarios')}
        />
        <MenuCard
          icon="settings-outline"
          title="Configuracion"
          description="Revisa branding, soporte, modo mock y puntos de integracion."
          onPress={() => navigation.navigate('Ajustes')}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Marca activa</Text>
        <Text style={styles.infoText}>{brand.appName}</Text>
        <Text style={styles.infoText}>Soporte: {brand.supportEmail}</Text>
        <Text style={styles.infoText}>Modo de datos: mock, listo para Supabase.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  hero: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  heroTitle: {
    ...typography.title,
    color: colors.text,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  metricValue: {
    ...typography.display,
    color: colors.primary,
  },
  metricLabel: {
    ...typography.body,
    color: colors.muted,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  infoTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  infoText: {
    ...typography.body,
    color: colors.muted,
  },
});
