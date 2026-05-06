import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppTextInput from '../../components/AppTextInput';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
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

function buildShippingLine(shippingAddress = {}) {
  const address = String(shippingAddress.address || '').trim();
  const city = String(shippingAddress.city || '').trim();
  const note = String(shippingAddress.note || '').trim();

  return [address, city, note].filter(Boolean).join(' | ');
}

export default function SellerOrdersScreen() {
  const {
    sellerOrders,
    loadAssignedSellerOrders,
    acceptCashOnDeliveryOrder,
    rejectCashOnDeliveryOrder,
    markCashOnDeliveryInPreparation,
    markCashOnDeliveryInTransit,
    confirmCashOnDeliveryWithOtp,
    confirmCashOnDeliveryPayment,
    submitCustomerRating,
    clearAppError,
  } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState('');
  const [otpValues, setOtpValues] = useState({});
  const [paymentNotes, setPaymentNotes] = useState({});
  const [customerRatings, setCustomerRatings] = useState({});

  useEffect(() => {
    refreshOrders();
  }, []);

  function setOrderOtp(orderId, value) {
    setOtpValues((current) => ({
      ...current,
      [orderId]: value,
    }));
  }

  function setOrderPaymentNote(orderId, value) {
    setPaymentNotes((current) => ({
      ...current,
      [orderId]: value,
    }));
  }

  function setOrderCustomerRating(orderId, stars) {
    setCustomerRatings((current) => ({
      ...current,
      [orderId]: stars,
    }));
  }

  async function refreshOrders() {
    setError('');
    clearAppError();
    setIsRefreshing(true);

    try {
      await loadAssignedSellerOrders();
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar los pedidos COD.');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function executeOrderAction(actionKey, task, successMessage) {
    setError('');
    setActiveActionKey(actionKey);

    try {
      await task();

      if (successMessage) {
        Alert.alert('Operacion exitosa', successMessage);
      }
    } catch (actionError) {
      setError(actionError.message || 'No fue posible completar la operacion.');
    } finally {
      setActiveActionKey('');
    }
  }

  function handleRejectOrder(order) {
    Alert.alert(
      'Rechazar pedido',
      `Se rechazara el pedido ${order.id} y el stock sera liberado.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () =>
            executeOrderAction(
              `${order.id}:reject`,
              () => rejectCashOnDeliveryOrder(order.id),
              'El pedido fue rechazado.',
            ),
        },
      ],
    );
  }

  function renderCustomerRatingPicker(order) {
    const selectedStars =
      Number(customerRatings[order.id] || order.sellerCustomerRating || 0) || 0;

    return (
      <View style={styles.ratingBlock}>
        <Text style={styles.sectionTitle}>Calificar cliente</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((stars) => {
            const isFilled = stars <= selectedStars;
            const locked = Boolean(order.sellerCustomerRatedAt);

            return (
              <Pressable
                key={`${order.id}-rating-${stars}`}
                onPress={() => setOrderCustomerRating(order.id, stars)}
                disabled={locked}
                style={styles.starButton}
              >
                <Ionicons
                  name={isFilled ? 'star' : 'star-outline'}
                  size={24}
                  color={isFilled ? '#F59E0B' : '#94A3B8'}
                />
              </Pressable>
            );
          })}
        </View>

        {order.sellerCustomerRatedAt ? (
          <Text style={styles.timelineMeta}>
            Ya calificaste al cliente con {order.sellerCustomerRating}/5 el{' '}
            {formatDateTime(order.sellerCustomerRatedAt)}.
          </Text>
        ) : (
          <PrimaryButton
            title="Guardar calificacion del cliente"
            tone="secondary"
            loading={activeActionKey === `${order.id}:rate-customer`}
            onPress={() => {
              if (!selectedStars || selectedStars < 1 || selectedStars > 5) {
                setError('Selecciona entre 1 y 5 estrellas para calificar al cliente.');
                return;
              }

              executeOrderAction(
                `${order.id}:rate-customer`,
                () => submitCustomerRating(order.id, selectedStars),
                'La calificacion del cliente fue registrada.',
              );
            }}
          />
        )}
      </View>
    );
  }

  const hasOrders = useMemo(() => sellerOrders.length > 0, [sellerOrders]);

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshOrders} />
      }
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Pedidos COD</Text>
        <Text style={styles.subtitle}>
          Aqui aceptas o rechazas pedidos contra entrega, confirmas entrega con OTP,
          registras el pago y cierras la venta completa.
        </Text>
      </View>

      <ErrorBanner message={error} />

      {!hasOrders && !isRefreshing ? (
        <EmptyState
          icon="trail-sign-outline"
          title="Sin pedidos contra entrega"
          description="Cuando un cliente cree un pedido COD asignado a tu catalogo, aparecera aqui."
          actionLabel="Actualizar"
          onAction={refreshOrders}
        />
      ) : null}

      {sellerOrders.map((order) => {
        const shippingLine = buildShippingLine(order.shippingAddress);
        const otpValue = otpValues[order.id] || '';
        const paymentNote = paymentNotes[order.id] || '';

        return (
          <View key={order.id} style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.orderCode}>Pedido {order.id}</Text>
                <Text style={styles.meta}>
                  Creado: {formatDateTime(order.createdAt)}
                </Text>
              </View>
              <Text style={styles.total}>{formatCurrency(order.total)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.meta}>{order.user?.name || 'Cliente'}</Text>
            <Text style={styles.meta}>{order.user?.email || 'Sin correo'}</Text>
            {order.customerPhoneNumber ? (
              <Text style={styles.meta}>Telefono: {order.customerPhoneNumber}</Text>
            ) : null}
            {shippingLine ? (
              <Text style={styles.meta}>Entrega: {shippingLine}</Text>
            ) : null}

            <View style={styles.statusGrid}>
              <View style={styles.statusCell}>
                <Text style={styles.statusLabel}>Pedido</Text>
                <Text style={styles.statusValue}>
                  {getOrderStatusLabel(order.orderStatus || order.status)}
                </Text>
              </View>
              <View style={styles.statusCell}>
                <Text style={styles.statusLabel}>Pago</Text>
                <Text style={styles.statusValue}>
                  {getPaymentStatusLabel(order.paymentStatus)}
                </Text>
              </View>
              <View style={styles.statusCell}>
                <Text style={styles.statusLabel}>Metodo</Text>
                <Text style={styles.statusValue}>
                  {getPaymentMethodLabel(order.paymentMethod)}
                </Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.sectionTitle}>Productos</Text>
              {order.items.map((item) => (
                <View key={`${order.id}-${item.id}`} style={styles.detailRow}>
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
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.timelineBlock}>
              <Text style={styles.sectionTitle}>Trazabilidad</Text>
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
                        {formatDateTime(event.createdAt)} | {event.changedBy?.name || 'Sistema'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.timelineMeta}>
                  Todavia no hay eventos registrados para este pedido.
                </Text>
              )}
            </View>

            {order.actions?.canAccept ? (
              <PrimaryButton
                title="Aceptar pedido"
                loading={activeActionKey === `${order.id}:accept`}
                onPress={() =>
                  executeOrderAction(
                    `${order.id}:accept`,
                    () => acceptCashOnDeliveryOrder(order.id),
                    'El pedido fue aceptado y quedo confirmado.',
                  )
                }
              />
            ) : null}

            {order.actions?.canReject ? (
              <PrimaryButton
                title="Rechazar pedido"
                tone="secondary"
                loading={activeActionKey === `${order.id}:reject`}
                onPress={() => handleRejectOrder(order)}
              />
            ) : null}

            {order.actions?.canPrepare ? (
              <PrimaryButton
                title="Marcar en preparacion"
                tone="secondary"
                loading={activeActionKey === `${order.id}:prepare`}
                onPress={() =>
                  executeOrderAction(
                    `${order.id}:prepare`,
                    () => markCashOnDeliveryInPreparation(order.id),
                    'El pedido paso a preparacion.',
                  )
                }
              />
            ) : null}

            {order.actions?.canDispatch ? (
              <PrimaryButton
                title="Marcar en camino"
                tone="secondary"
                loading={activeActionKey === `${order.id}:dispatch`}
                onPress={() =>
                  executeOrderAction(
                    `${order.id}:dispatch`,
                    () => markCashOnDeliveryInTransit(order.id),
                    'El pedido fue marcado en camino.',
                  )
                }
              />
            ) : null}

            {order.actions?.canConfirmDelivery ? (
              <View style={styles.formBlock}>
                <Text style={styles.sectionTitle}>Confirmar entrega con OTP</Text>
                <AppTextInput
                  label="Codigo OTP del cliente"
                  value={otpValue}
                  onChangeText={(value) => setOrderOtp(order.id, value)}
                  keyboardType="number-pad"
                  placeholder="Ingresa el codigo de 6 digitos"
                />
                <PrimaryButton
                  title="Confirmar entrega"
                  tone="secondary"
                  loading={activeActionKey === `${order.id}:deliver`}
                  onPress={() => {
                    if (!otpValue.trim()) {
                      setError('Ingresa el OTP recibido por el cliente.');
                      return;
                    }

                    executeOrderAction(
                      `${order.id}:deliver`,
                      () => confirmCashOnDeliveryWithOtp(order.id, otpValue),
                      'La entrega fue confirmada correctamente.',
                    );
                  }}
                />
              </View>
            ) : null}

            {order.actions?.canConfirmPayment ? (
              <View style={styles.formBlock}>
                <Text style={styles.sectionTitle}>Confirmar pago recibido</Text>
                <AppTextInput
                  label="Nota del cobro"
                  value={paymentNote}
                  onChangeText={(value) => setOrderPaymentNote(order.id, value)}
                  placeholder="Opcional: efectivo exacto, observaciones, etc."
                />
                <PrimaryButton
                  title="Confirmar pago"
                  loading={activeActionKey === `${order.id}:pay`}
                  onPress={() =>
                    executeOrderAction(
                      `${order.id}:pay`,
                      () => confirmCashOnDeliveryPayment(order.id, paymentNote),
                      'El pago fue confirmado.',
                    )
                  }
                />
              </View>
            ) : null}

            {(order.actions?.canRateCustomer || order.sellerCustomerRatedAt) &&
            String(order.orderStatus || '').toLowerCase() === 'completado'
              ? renderCustomerRatingPicker(order)
              : null}
          </View>
        );
      })}
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
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    orderCode: {
      ...typography.subtitle,
      color: colors.text,
    },
    total: {
      ...typography.bodyStrong,
      color: colors.primary,
    },
    sectionTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    meta: {
      ...typography.body,
      color: colors.muted,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    statusCell: {
      flex: 1,
      minWidth: 100,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    statusLabel: {
      ...typography.caption,
      color: colors.muted,
    },
    statusValue: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    detailBlock: {
      gap: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
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
    timelineBlock: {
      gap: spacing.sm,
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
    formBlock: {
      gap: spacing.sm,
    },
    ratingBlock: {
      gap: spacing.sm,
    },
    ratingRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    starButton: {
      paddingVertical: spacing.xs,
    },
  });
