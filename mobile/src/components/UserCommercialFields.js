import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppTextInput from './AppTextInput';
import { useAppTheme, useThemedStyles } from '../theme';

const REQUIRED_SUFFIX = ' *';
const OPTIONAL_SUFFIX = ' (opcional)';

function buildLabel(label, isRequired) {
  return `${label}${isRequired ? REQUIRED_SUFFIX : OPTIONAL_SUFFIX}`;
}

export default function UserCommercialFields({
  form,
  isSeller,
  onChange,
  showVerification = true,
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <AppTextInput
        label={buildLabel('Cedula/RUC', isSeller)}
        value={form.cedulaRuc}
        onChangeText={(value) => onChange('cedulaRuc', value)}
        keyboardType="number-pad"
        placeholder="Identificacion tributaria"
      />
      <AppTextInput
        label={buildLabel('Direccion', isSeller)}
        value={form.direccion}
        onChangeText={(value) => onChange('direccion', value)}
        placeholder="Direccion principal"
      />
      <AppTextInput
        label={buildLabel('Ciudad', isSeller)}
        value={form.ciudad}
        onChangeText={(value) => onChange('ciudad', value)}
        placeholder="Ciudad"
      />
      <AppTextInput
        label={buildLabel('Cuenta bancaria', isSeller)}
        value={form.cuentaBancaria}
        onChangeText={(value) => onChange('cuentaBancaria', value)}
        placeholder="Numero o alias de cuenta"
      />
      <AppTextInput
        label={buildLabel('Cuenta PayPhone', isSeller)}
        value={form.cuentaPayphone}
        onChangeText={(value) => onChange('cuentaPayphone', value)}
        placeholder="Cuenta asociada a PayPhone"
      />

      {showVerification ? (
        <Pressable
          style={[styles.toggle, form.verificado && styles.toggleActive]}
          onPress={() => onChange('verificado', !form.verificado)}
        >
          <View style={styles.toggleCopy}>
            <Text style={[styles.toggleTitle, form.verificado && styles.toggleTitleActive]}>
              Usuario verificado
            </Text>
            <Text style={styles.toggleSubtitle}>
              {form.verificado ? 'Activo' : 'Pendiente'}
            </Text>
          </View>
          <Ionicons
            name={form.verificado ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={form.verificado ? colors.primary : colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.lg,
    },
    toggle: {
      minHeight: 58,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    toggleActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    toggleCopy: {
      flex: 1,
      gap: 2,
    },
    toggleTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    toggleTitleActive: {
      color: colors.primary,
    },
    toggleSubtitle: {
      ...typography.caption,
      color: colors.muted,
    },
  });
