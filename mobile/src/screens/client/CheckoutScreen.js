import React, { useEffect, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import {
  canRateCompletedOrder,
  PAYMENT_METHODS,
  PAYPHONE_COUNTRY_CODE,
  PAYPHONE_PAYMENT_METHOD,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  isCashOnDeliveryOrder,
  isPendingPayphoneOrder,
  shouldShowDeliveryOtp,
} from '../../config/commerce';
import { formatCurrency, formatDateTime } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

export default function CheckoutScreen({ navigation }) {
  const { cartSummary, checkout, refreshOrderPaymentStatus, state, user, lastOrder } =
    useAppStore();
  const styles = useThemedStyles(createStyles);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [paymentMethod, setPaymentMethod] = useState(PAYPHONE_PAYMENT_METHOD);
  const [orderInProgress, setOrderInProgress] = useState(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.phoneNumber && !phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user?.phoneNumber, phoneNumber]);

  useEffect(() => {
    if (!orderInProgress && lastOrder?.id) {
      setOrderInProgress(lastOrder);
    }
  }, [lastOrder, orderInProgress]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        orderInProgress?.paymentProvider === 'payphone' &&
        orderInProgress?.paymentStatus === 'pending' &&
        !isRefreshingStatus
      ) {
        handleRefreshStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [orderInProgress, isRefreshingStatus]);

  function handleBackToProducts() {
    const parentNavigation = navigation.getParent();

    if (parentNavigation) {
      parentNavigation.navigate('Inicio', {
        screen: 'CatalogoLista',
      });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  async function handleCheckout() {
    setError('');

    if (!address.trim() || !city.trim()) {
      setError('Completa direccion y ciudad para continuar.');
      return;
    }

    if (!phoneNumber.trim() && paymentMethod === PAYPHONE_PAYMENT_METHOD) {
      setError('Ingresa el telefono del cliente para pagar con PayPhone.');
      return;
    }

    try {
      const order = await checkout({
        paymentMethod,
        phoneNumber,
        countryCode: PAYPHONE_COUNTRY_CODE,
        shippingAddress: {
          address,
          city,
          note,
        },
      });
      setOrderInProgress(order);

      if (isPendingPayphoneOrder(order)) {
        Alert.alert(
          'Pedido creado',
          `Pedido ${order.id} creado por ${formatCurrency(order.total)}. Completa el cobro en PayPhone y luego consulta el estado.`,
        );
        return;
      }

      if (order.paymentStatus === 'failed' || order.paymentStatus === 'canceled') {
        setError(
          order.payphoneMessage ||
            'El cobro con PayPhone no pudo completarse. Puedes intentarlo nuevamente.',
        );
        return;
      }

      if (isCashOnDeliveryOrder(order)) {
        Alert.alert(
          'Pedido contra entrega creado',
          `Pedido ${order.id} registrado. El vendedor debe aceptarlo antes de prepararlo y enviarlo.`,
          [
            {
              text: 'Aceptar',
              onPress: () => navigation.navigate('Perfil'),
            },
          ],
        );
        return;
      }

      Alert.alert(
        'Pedido confirmado',
        `Pedido ${order.id} confirmado por ${formatCurrency(order.total)}.`,
        [
          {
            text: 'Aceptar',
            onPress: () =>
              canRateCompletedOrder(order)
                ? navigation.navigate('OrderRating', { orderId: order.id })
                : navigation.navigate('Perfil'),
          },
        ],
      );
    } catch (checkoutError) {
      setError(checkoutError.message);
    }
  }

  async function handleRefreshStatus() {
    if (!orderInProgress?.id) {
      return;
    }

    setError('');
    setIsRefreshingStatus(true);

    try {
      const updatedOrder = await refreshOrderPaymentStatus(orderInProgress.id);
      setOrderInProgress(updatedOrder);

      if (updatedOrder.paymentStatus === 'paid') {
        Alert.alert(
          'Pago aprobado',
          `El pedido ${updatedOrder.id} ya fue aprobado por ${formatCurrency(updatedOrder.total)}.`,
          [
            {
              text: 'Aceptar',
              onPress: () =>
                canRateCompletedOrder(updatedOrder)
                  ? navigation.navigate('OrderRating', {
                      orderId: updatedOrder.id,
                    })
                  : navigation.navigate('Perfil'),
            },
          ],
        );
        return;
      }

      if (updatedOrder.paymentStatus === 'canceled') {
        Alert.alert(
          'Pago cancelado',
          updatedOrder.payphoneMessage ||
            'PayPhone reporto que el pago fue cancelado.',
        );
        return;
      }

      if (updatedOrder.paymentStatus === 'failed') {
        Alert.alert(
          'Pago fallido',
          updatedOrder.payphoneMessage ||
            'PayPhone no aprobo la transaccion.',
        );
        return;
      }

      Alert.alert(
        'Pago pendiente',
        'PayPhone aun no reporta la aprobacion del cobro.',
      );
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setIsRefreshingStatus(false);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Pago</Text>
        <Text style={styles.summaryText}>
          {paymentMethod === PAYPHONE_PAYMENT_METHOD
            ? `Tarjeta por PayPhone con IVA ${cartSummary.vatPercent}% y validacion por backend.`
            : `Contra entrega con IVA ${cartSummary.vatPercent}% aplicado. El vendedor confirmara el pedido, entrega y cobro por separado.`}
        </Text>
        <Text style={styles.summaryAmount}>{formatCurrency(cartSummary.total)}</Text>
      </View>

      <View style={styles.formCard}>
        <ErrorBanner message={error || state.appError} />

        <AppTextInput
          label="Direccion"
          value={address}
          onChangeText={setAddress}
          placeholder="Calle principal y referencia"
        />
        <AppTextInput
          label="Ciudad"
          value={city}
          onChangeText={setCity}
          placeholder="Quito"
        />
        <AppTextInput
          label={
            paymentMethod === PAYPHONE_PAYMENT_METHOD
              ? 'Telefono PayPhone'
              : 'Telefono de contacto'
          }
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder="0984112233"
        />
        <AppTextInput
          label="Nota"
          value={note}
          onChangeText={setNote}
          placeholder="Observaciones opcionales"
        />

        <View style={styles.methodBlock}>
          <Text style={styles.methodLabel}>Metodo de pago</Text>
          <View style={styles.methodRow}>
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method.value}
                style={[
                  styles.methodChip,
                  paymentMethod === method.value && styles.methodChipActive,
                ]}
                onPress={() => setPaymentMethod(method.value)}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === method.value && styles.methodTextActive,
                  ]}
                >
                  {method.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <PrimaryButton
          title="Confirmar pedido"
          onPress={handleCheckout}
          loading={state.isCheckoutLoading}
        />
        <PrimaryButton
          title="Volver a productos"
          onPress={handleBackToProducts}
          tone="secondary"
        />
      </View>

      {orderInProgress ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Ultimo pedido</Text>
          <Text style={styles.statusMeta}>Pedido: {orderInProgress.id}</Text>
          <Text style={styles.statusMeta}>
            Estado: {getOrderStatusLabel(orderInProgress.orderStatus || orderInProgress.status)}
          </Text>
          <Text style={styles.statusMeta}>
            Pago: {getPaymentStatusLabel(orderInProgress.paymentStatus)}
          </Text>
          <Text style={styles.statusMeta}>
            Metodo: {getPaymentMethodLabel(orderInProgress.paymentMethod)}
          </Text>
          {orderInProgress.customerPhoneNumber ? (
            <Text style={styles.statusMeta}>
              Telefono: {orderInProgress.customerPhoneNumber}
            </Text>
          ) : null}
          {orderInProgress.payphoneClientTransactionId ? (
            <Text style={styles.statusMeta}>
              Transaccion cliente: {orderInProgress.payphoneClientTransactionId}
            </Text>
          ) : null}
          {orderInProgress.payphoneTransactionStatus ? (
            <Text style={styles.statusMeta}>
              Estado PayPhone: {orderInProgress.payphoneTransactionStatus}
            </Text>
          ) : null}
          {orderInProgress.paymentExpiresAt ? (
            <Text style={styles.statusMeta}>
              Expira: {formatDateTime(orderInProgress.paymentExpiresAt)}
            </Text>
          ) : null}
          {shouldShowDeliveryOtp(orderInProgress) ? (
            <Text style={styles.statusOtp}>
              OTP de entrega: {orderInProgress.deliveryOtp}
            </Text>
          ) : null}
          {orderInProgress.payphoneMessage ? (
            <Text style={styles.statusMessage}>{orderInProgress.payphoneMessage}</Text>
          ) : null}

          {orderInProgress.paymentProvider === 'payphone' ? (
            <PrimaryButton
              title="Consultar estado del pago"
              onPress={handleRefreshStatus}
              loading={isRefreshingStatus}
              tone="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    summaryCard: {
      backgroundColor: colors.secondary,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      gap: spacing.md,
    },
    summaryTitle: {
      ...typography.title,
      color: colors.white,
    },
    summaryText: {
      ...typography.body,
      color: colors.onDarkSoft,
    },
    summaryAmount: {
      ...typography.display,
      color: colors.white,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      gap: spacing.lg,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      gap: spacing.sm,
    },
    statusTitle: {
      ...typography.subtitle,
      color: colors.text,
    },
    statusMeta: {
      ...typography.body,
      color: colors.muted,
    },
    statusMessage: {
      ...typography.bodyStrong,
      color: colors.warning,
    },
    statusOtp: {
      ...typography.bodyStrong,
      color: colors.primary,
    },
    methodBlock: {
      gap: spacing.sm,
    },
    methodLabel: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    methodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    methodChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    methodChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    methodText: {
      ...typography.body,
      color: colors.text,
    },
    methodTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
