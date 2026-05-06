import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LogoMark from '../../components/LogoMark';
import MenuCard from '../../components/MenuCard';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

export default function SellerDashboardScreen({ navigation }) {
  const { user, products, sellerSales, sellerOrders, loadSellerSales, loadAssignedSellerOrders } =
    useAppStore();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    loadSellerSales().catch(() => undefined);
    loadAssignedSellerOrders().catch(() => undefined);
  }, []);

  const ownProducts = products.filter((item) => item.sellerId === user?.id);
  const totalRevenue = sellerSales.reduce((total, sale) => total + Number(sale.total || 0), 0);
  const totalUnits = sellerSales.reduce(
    (total, sale) => total + Number(sale.totalUnits || 0),
    0,
  );

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <LogoMark />
        <Text style={styles.heroTitle}>Panel vendedor</Text>
        <Text style={styles.heroSubtitle}>
          {user?.name}, desde aqui registras productos y revisas las ventas de tu catalogo.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{ownProducts.length}</Text>
          <Text style={styles.metricLabel}>Productos</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{sellerOrders.length}</Text>
          <Text style={styles.metricLabel}>Pedidos COD</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{sellerSales.length}</Text>
          <Text style={styles.metricLabel}>Ventas</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{totalUnits}</Text>
          <Text style={styles.metricLabel}>Unidades</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total vendido</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
        <Text style={styles.summaryHint}>
          Este total considera solo las ventas de productos asociados a tu usuario vendedor.
        </Text>
      </View>

      <View style={styles.menuGrid}>
        <MenuCard
          icon="cube-outline"
          title="Mis productos"
          description="Ingresa nuevos productos y revisa los ya asignados a tu cuenta."
          onPress={() => navigation.navigate('Productos')}
        />
        <MenuCard
          icon="trail-sign-outline"
          title="Pedidos COD"
          description="Acepta, rechaza, entrega con OTP y confirma el pago contra entrega."
          onPress={() => navigation.navigate('Pedidos')}
        />
        <MenuCard
          icon="cash-outline"
          title="Mis ventas"
          description="Consulta cada venta con cliente, items y totales vinculados a tus productos."
          onPress={() => navigation.navigate('Ventas')}
        />
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
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
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    summaryLabel: {
      ...typography.bodyStrong,
      color: colors.muted,
    },
    summaryValue: {
      ...typography.title,
      color: colors.primary,
    },
    summaryHint: {
      ...typography.body,
      color: colors.muted,
    },
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
  });
