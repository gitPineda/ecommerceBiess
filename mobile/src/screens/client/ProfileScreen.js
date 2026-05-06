import React, { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import LogoMark from '../../components/LogoMark';
import PrimaryButton from '../../components/PrimaryButton';
import ProductMedia from '../../components/ProductMedia';
import ScreenContainer from '../../components/ScreenContainer';
import ThemeSelectorCard from '../../components/ThemeSelectorCard';
import brand from '../../config/brand.json';
import {
  canRateCompletedOrder,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  isPendingPayphoneOrder,
  shouldShowDeliveryOtp,
} from '../../config/commerce';
import { formatCurrency, formatDateTime } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

function buildShippingLine(shippingAddress = {}) {
  const address = String(shippingAddress.address || '').trim();
  const city = String(shippingAddress.city || '').trim();
  const note = String(shippingAddress.note || '').trim();

  return [address, city, note].filter(Boolean).join(' | ');
}

export default function ProfileScreen({ navigation }) {
  const {
    user,
    company,
    signOut,
    orders,
    lastOrder,
    loadOrders,
    refreshOrderPaymentStatus,
  } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const isCustomer = user?.role === brand.roles.customer;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const visibleOrders = (orders.length ? orders : lastOrder ? [lastOrder] : []).slice(0, 5);

  useEffect(() => {
    if (isCustomer) {
      handleRefreshOrders().catch(() => undefined);
    }
  }, [isCustomer]);

  async function handleRefreshOrders() {
    if (!isCustomer) {
      return;
    }

    setIsRefreshing(true);

    try {
      await loadOrders();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRefreshPayphoneOrder(orderId) {
    setIsRefreshing(true);

    try {
      const updatedOrder = await refreshOrderPaymentStatus(orderId);

      if (canRateCompletedOrder(updatedOrder)) {
        navigation.navigate('Carrito', {
          screen: 'OrderRating',
          params: { orderId: updatedOrder.id },
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={styles.content}
      refreshControl={
        isCustomer ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefreshOrders} />
        ) : undefined
      }
    >
      <View style={styles.profileCard}>
        <LogoMark />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>@{user?.username}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        {user?.phoneNumber ? <Text style={styles.meta}>{user.phoneNumber}</Text> : null}
        <Text style={styles.meta}>Rol: {user?.role}</Text>
        {typeof user?.sellerRating === 'number' && user.role === brand.roles.seller ? (
          <Text style={styles.meta}>
            Calificacion vendedor: {user.sellerRating.toFixed(2)} / 5
          </Text>
        ) : null}
        {typeof user?.customerRating === 'number' && user.role === brand.roles.customer ? (
          <Text style={styles.meta}>
            Calificacion cliente: {user.customerRating.toFixed(2)} / 5
          </Text>
        ) : null}
      </View>

      <ThemeSelectorCard />

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>Configuracion general</Text>
        <Text style={styles.description}>
          Marca activa, soporte y personalizacion visual de la linea blanca.
        </Text>
        <Text style={styles.meta}>Marca: {company?.appName}</Text>
        <Text style={styles.meta}>Soporte: {company?.supportEmail}</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>
          {isCustomer ? 'Mis pedidos' : 'Actividad del rol'}
        </Text>
        {isCustomer ? (
          <>
            {!orders.length && !lastOrder ? (
              <Text style={styles.description}>
                Todavia no tienes pedidos registrados.
              </Text>
            ) : null}

            {visibleOrders.map((order) => {
              const shippingLine = buildShippingLine(order.shippingAddress);

              return (
                <View key={order.id} style={styles.orderCard}>
                  <Text style={styles.orderCode}>Pedido {order.id}</Text>
                  <Text style={styles.meta}>
                    Creado: {formatDateTime(order.createdAt)}
                  </Text>
                  <Text style={styles.meta}>
                    Estado: {getOrderStatusLabel(order.orderStatus || order.status)}
                  </Text>
                  <Text style={styles.meta}>
                    Pago: {getPaymentMethodLabel(order.paymentMethod)} |{' '}
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </Text>
                  <Text style={styles.meta}>Total: {formatCurrency(order.total)}</Text>
                  {order.assignedSeller?.name ? (
                    <Text style={styles.meta}>
                      Vendedor: {order.assignedSeller.name}
                    </Text>
                  ) : null}
                  {shippingLine ? (
                    <Text style={styles.meta}>Entrega: {shippingLine}</Text>
                  ) : null}
                  {shouldShowDeliveryOtp(order) ? (
                    <View style={styles.otpCard}>
                      <Text style={styles.otpLabel}>Codigo OTP de entrega</Text>
                      <Text style={styles.otpValue}>{order.deliveryOtp}</Text>
                      <Text style={styles.otpHelp}>
                        Compartelo solo cuando recibas el pedido.
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.timelineBlock}>
                    <Text style={styles.sectionTitle}>Paso a paso</Text>
                    {(order.timeline || []).length ? (
                      order.timeline.map((event) => (
                        <View key={`${order.id}-timeline-${event.id}`} style={styles.timelineRow}>
                          <View style={styles.timelineDot} />
                          <View style={styles.timelineCopy}>
                            <Text style={styles.timelineTitle}>
                              {getOrderStatusLabel(event.toStatus)}
                            </Text>
                            <Text style={styles.timelineMeta}>
                              {event.note || 'Cambio de estado registrado'}
                            </Text>
                            <Text style={styles.timelineMeta}>
                              {formatDateTime(event.createdAt)}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.timelineMeta}>
                        Todavia no existen eventos de seguimiento para este pedido.
                      </Text>
                    )}
                  </View>

                  <View style={styles.itemsBlock}>
                    <Text style={styles.sectionTitle}>Productos</Text>
                    {order.items.map((item) => (
                      <View key={`${order.id}-${item.id}`} style={styles.itemRow}>
                        <ProductMedia
                          product={item}
                          imageUrl={item.imageUrl}
                          variant="thumb"
                          width={56}
                          height={56}
                          borderRadius={16}
                          iconSize={22}
                        />
                        <View style={styles.itemCopy}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.timelineMeta}>
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {isPendingPayphoneOrder(order) ? (
                    <PrimaryButton
                      title="Consultar estado del pago"
                      tone="secondary"
                      loading={isRefreshing}
                      onPress={() => handleRefreshPayphoneOrder(order.id)}
                    />
                  ) : null}

                  {canRateCompletedOrder(order) ? (
                    <PrimaryButton
                      title="Calificar productos"
                      tone="secondary"
                      onPress={() =>
                        navigation.navigate('Carrito', {
                          screen: 'OrderRating',
                          params: { orderId: order.id },
                        })
                      }
                    />
                  ) : null}
                </View>
              );
            })}
            {orders.length > 5 ? (
              <Text style={styles.historyHint}>
                Se muestran solo las 5 compras mas recientes.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.description}>
            Tu actividad operativa se refleja en los modulos de tu rol actual.
          </Text>
        )}
      </View>

      <PrimaryButton title="Cerrar sesion" tone="secondary" onPress={signOut} />
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
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
    orderCard: {
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    orderCode: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    otpCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: spacing.xs,
    },
    otpLabel: {
      ...typography.caption,
      color: colors.muted,
    },
    otpValue: {
      ...typography.title,
      color: colors.primary,
      letterSpacing: 2,
    },
    otpHelp: {
      ...typography.caption,
      color: colors.muted,
    },
    timelineBlock: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    timelineRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    timelineDot: {
      width: 10,
      height: 10,
      marginTop: 6,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    timelineCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    timelineTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    timelineMeta: {
      ...typography.caption,
      color: colors.muted,
    },
    itemsBlock: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    itemRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    itemCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    itemName: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    historyHint: {
      ...typography.caption,
      color: colors.muted,
      textAlign: 'center',
    },
  });
