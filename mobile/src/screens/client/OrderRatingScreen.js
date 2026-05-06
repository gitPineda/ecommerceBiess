import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ProductMedia from '../../components/ProductMedia';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

function buildInitialRatings(order) {
  return (order?.items || []).reduce((accumulator, item) => {
    if (item.customerRating) {
      accumulator[item.id] = Number(item.customerRating);
    }
    return accumulator;
  }, {});
}

export default function OrderRatingScreen({ navigation, route }) {
  const { orders, lastOrder, submitOrderRatings } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const orderId = route.params?.orderId || '';
  const order =
    orders.find((currentOrder) => currentOrder.id === orderId) ||
    (lastOrder?.id === orderId ? lastOrder : null);
  const [ratings, setRatings] = useState(() => buildInitialRatings(order));
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRatings(buildInitialRatings(order));
  }, [order]);

  const pendingItems = useMemo(
    () => (order?.items || []).filter((item) => item.customerRating == null),
    [order],
  );

  function handleSelectStars(orderItemId, stars) {
    setRatings((current) => ({
      ...current,
      [orderItemId]: stars,
    }));
  }

  async function handleSaveRatings() {
    setError('');
    setFeedback('');

    if (!order) {
      setError('No se encontro el pedido a calificar.');
      return;
    }

    if (!order.customerCanRateSeller && !order.ratingEligible && pendingItems.length) {
      setError('Solo puedes calificar pedidos completados y pagados.');
      return;
    }

    if (!pendingItems.length) {
      setFeedback('Todos los productos de este pedido ya fueron calificados.');
      return;
    }

    const ratingsPayload = pendingItems.map((item) => ({
      orderItemId: item.id,
      stars: Number(ratings[item.id] || 0),
    }));

    if (ratingsPayload.some((item) => item.stars < 1 || item.stars > 5)) {
      setError('Debes asignar entre 1 y 5 estrellas a cada producto pendiente.');
      return;
    }

    setIsSaving(true);

    try {
      await submitOrderRatings(order.id, ratingsPayload);
      setFeedback('Calificaciones guardadas correctamente.');
      navigation.navigate('Perfil');
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar la calificacion.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Calificar productos</Text>
        <Text style={styles.subtitle}>
          Asigna entre 1 y 5 estrellas a los productos de un pedido completado.
        </Text>
        {order ? <Text style={styles.meta}>Pedido: {order.id}</Text> : null}
      </View>

      <ErrorBanner
        message={feedback || error}
        tone={feedback ? 'success' : 'danger'}
      />

      {(order?.items || []).map((item) => {
        const selectedStars = Number(ratings[item.id] || 0);
        const lockedStars =
          item.customerRating == null
            ? null
            : Number(item.customerRating);

        return (
          <View key={`${order?.id}-${item.id}`} style={styles.card}>
            <View style={styles.productRow}>
              <ProductMedia
                product={item}
                imageUrl={item.imageUrl}
                variant="thumb"
                width={72}
                height={72}
                borderRadius={18}
                iconSize={26}
              />
              <View style={styles.productCopy}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productMeta}>
                  {item.category} | {item.quantity} x {formatCurrency(item.unitPrice)}
                </Text>
                <Text style={styles.productMeta}>
                  Vendedor: {item.sellerName}
                </Text>
              </View>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((stars) => {
                const isFilled =
                  lockedStars !== null ? stars <= lockedStars : stars <= selectedStars;

                return (
                  <Pressable
                    key={`${item.id}-${stars}`}
                    disabled={lockedStars !== null}
                    onPress={() => handleSelectStars(item.id, stars)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={isFilled ? 'star' : 'star-outline'}
                      size={28}
                      color={isFilled ? '#F59E0B' : '#94A3B8'}
                    />
                  </Pressable>
                );
              })}
            </View>

            {lockedStars !== null ? (
              <Text style={styles.lockedText}>
                Ya calificaste este producto con {lockedStars} estrella(s).
              </Text>
            ) : null}
          </View>
        );
      })}

      <PrimaryButton
        title="Guardar calificaciones"
        onPress={handleSaveRatings}
        loading={isSaving}
      />
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
    meta: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      gap: spacing.md,
    },
    productRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    productCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    productName: {
      ...typography.subtitle,
      color: colors.text,
    },
    productMeta: {
      ...typography.body,
      color: colors.muted,
    },
    starsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    starButton: {
      paddingVertical: spacing.xs,
    },
    lockedText: {
      ...typography.caption,
      color: colors.success,
    },
  });
