import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

export default function CheckoutScreen({ navigation }) {
  const { cartSummary, checkout, state } = useAppStore();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tarjeta simulada');
  const [error, setError] = useState('');

  async function handleCheckout() {
    setError('');

    if (!address.trim() || !city.trim()) {
      setError('Completa direccion y ciudad para continuar.');
      return;
    }

    try {
      const order = await checkout({
        paymentMethod,
        shippingAddress: {
          address,
          city,
          note,
        },
      });

      Alert.alert(
        'Pago simulado completado',
        `Pedido ${order.id} confirmado por ${formatCurrency(order.total)}.`,
        [
          {
            text: 'Aceptar',
            onPress: () => navigation.navigate('CarritoLista'),
          },
        ],
      );
    } catch (checkoutError) {
      setError(checkoutError.message);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Pago basico</Text>
        <Text style={styles.summaryText}>
          Flujo listo para integrar pasarela real cuando se conecte la API.
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
          label="Nota"
          value={note}
          onChangeText={setNote}
          placeholder="Observaciones opcionales"
        />

        <View style={styles.methodBlock}>
          <Text style={styles.methodLabel}>Metodo de pago</Text>
          <View style={styles.methodRow}>
            {['Tarjeta simulada', 'Contra entrega'].map((method) => (
              <Pressable
                key={method}
                style={[
                  styles.methodChip,
                  paymentMethod === method && styles.methodChipActive,
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === method && styles.methodTextActive,
                  ]}
                >
                  {method}
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
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    color: '#FFF1E8',
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
