import React, { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import ScreenContainer from '../../components/ScreenContainer';
import { formatAuditDateTime } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

function renderDetail(detail) {
  if (!detail) {
    return '';
  }

  if (detail.cabecera?.pedidoId) {
    return `Pedido ${detail.cabecera.pedidoId} | Total ${detail.cabecera.total}`;
  }

  if (detail.producto?.sku) {
    return `${detail.producto.name} | SKU ${detail.producto.sku}`;
  }

  if (detail.usuarioCreado?.email) {
    return `${detail.usuarioCreado.email} | Rol ${detail.usuarioCreado.role}`;
  }

  if (detail.identificador) {
    return `Acceso con ${detail.identificador}`;
  }

  return '';
}

export default function AuditScreen() {
  const { audits, loadAudits, clearAppError } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshAudits();
  }, []);

  async function refreshAudits() {
    setError('');
    clearAppError();
    setIsRefreshing(true);

    try {
      await loadAudits();
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar la auditoria.');
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshAudits} />
      }
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Auditoria</Text>
        <Text style={styles.subtitle}>
          Registro de ingresos, compras y actividades administrativas.
        </Text>
      </View>

      <ErrorBanner message={error} />

      {!audits.length && !isRefreshing ? (
        <EmptyState
          icon="document-text-outline"
          title="Sin auditorias"
          description="Todavia no existen eventos registrados para mostrar."
          actionLabel="Actualizar"
          onAction={refreshAudits}
        />
      ) : null}

      {audits.map((audit) => (
        <View key={`${audit.id}`} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.activity}>{audit.actividad}</Text>
            <Text style={styles.timestamp}>{formatAuditDateTime(audit.fechaHora)}</Text>
          </View>
          <Text style={styles.user}>{audit.usuario}</Text>
          {renderDetail(audit.detalle) ? (
            <Text style={styles.detail}>{renderDetail(audit.detalle)}</Text>
          ) : null}
          <View style={styles.metaGroup}>
            <Text style={styles.metaLabel}>IP</Text>
            <Text style={styles.metaValue}>{audit.direccionIp || 'No disponible'}</Text>
          </View>
          <View style={styles.metaGroup}>
            <Text style={styles.metaLabel}>Origen</Text>
            <Text style={styles.metaValue}>
              {audit.origenConexion || 'No disponible'}
            </Text>
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
    activity: {
      ...typography.bodyStrong,
      color: colors.primary,
      flex: 1,
    },
    timestamp: {
      ...typography.caption,
      color: colors.muted,
      textAlign: 'right',
    },
    user: {
      ...typography.subtitle,
      color: colors.text,
    },
    detail: {
      ...typography.body,
      color: colors.text,
    },
    metaGroup: {
      gap: spacing.xs,
    },
    metaLabel: {
      ...typography.caption,
      color: colors.muted,
    },
    metaValue: {
      ...typography.body,
      color: colors.text,
    },
  });
