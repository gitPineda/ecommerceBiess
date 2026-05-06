import React, { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import ProductMedia from '../../components/ProductMedia';
import ScreenContainer from '../../components/ScreenContainer';
import {
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '../../config/commerce';
import { formatCurrency, formatDateTime } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

export default function SellerSalesScreen() {
  const { sellerSales, loadSellerSales, clearAppError } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshSales();
  }, []);

  async function refreshSales() {
    setError('');
    clearAppError();
    setIsRefreshing(true);

    try {
      await loadSellerSales();
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar las ventas.');
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshSales} />
      }
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Mis ventas</Text>
        <Text style={styles.subtitle}>
          Cada registro resume una venta que incluyo productos asociados a tu usuario vendedor.
        </Text>
        {sellerSales[0]?.seller?.rating ? (
          <Text style={styles.subtitle}>
            Calificacion actual: {Number(sellerSales[0].seller.rating).toFixed(2)} / 5
          </Text>
        ) : null}
      </View>

      <ErrorBanner message={error} />

      {!sellerSales.length && !isRefreshing ? (
        <EmptyState
          icon="cash-outline"
          title="Sin ventas registradas"
          description="Cuando un cliente compre tus productos, la venta aparecera aqui."
          actionLabel="Actualizar"
          onAction={refreshSales}
        />
      ) : null}

      {sellerSales.map((sale) => (
        <View key={sale.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.orderCode}>Pedido {sale.orderId}</Text>
              <Text style={styles.orderMeta}>{formatDateTime(sale.createdAt)}</Text>
            </View>
            <Text style={styles.total}>{formatCurrency(sale.total)}</Text>
          </View>

          <Text style={styles.customerName}>{sale.customer?.fullName || 'Cliente'}</Text>
          <Text style={styles.meta}>Correo: {sale.customer?.email || 'No disponible'}</Text>
          <Text style={styles.meta}>Pago: {getPaymentMethodLabel(sale.paymentMethod)}</Text>
          <Text style={styles.meta}>
            Estado: {getOrderStatusLabel(sale.orderStatus || sale.status)}
          </Text>
          <Text style={styles.meta}>
            Cobro: {getPaymentStatusLabel(sale.paymentStatus)}
          </Text>
          <Text style={styles.meta}>Unidades vendidas: {sale.totalUnits}</Text>

          <View style={styles.detailBlock}>
            <Text style={styles.detailTitle}>Detalle</Text>
            {sale.items.map((item) => (
              <View key={`${sale.id}-${item.id}`} style={styles.detailRow}>
                <ProductMedia
                  product={item}
                  imageUrl={item.imageUrl}
                  variant="thumb"
                  width={56}
                  height={56}
                  borderRadius={16}
                  iconSize={22}
                />
                <View style={styles.detailCopy}>
                  <Text style={styles.detailName}>{item.name}</Text>
                  <Text style={styles.detailMeta}>
                    {item.category} | {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                  {item.customerRating ? (
                    <Text style={styles.detailMeta}>
                      Calificacion cliente: {item.customerRating}/5
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.detailTotal}>{formatCurrency(item.lineTotal)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    headerCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      gap: spacing.sm,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.muted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    rowCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    orderCode: {
      ...typography.subtitle,
      color: colors.text,
    },
    orderMeta: {
      ...typography.caption,
      color: colors.muted,
    },
    total: {
      ...typography.bodyStrong,
      color: colors.primary,
    },
    customerName: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    meta: {
      ...typography.body,
      color: colors.muted,
    },
    detailBlock: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    detailTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    detailCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    detailName: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    detailMeta: {
      ...typography.caption,
      color: colors.muted,
    },
    detailTotal: {
      ...typography.bodyStrong,
      color: colors.primary,
    },
  });
