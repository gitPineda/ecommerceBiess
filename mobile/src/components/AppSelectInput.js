import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, useThemedStyles } from '../theme';

export default function AppSelectInput({
  label,
  value,
  options = [],
  placeholder = 'Selecciona una opcion',
  error = '',
  onChange,
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) || null,
    [options, value],
  );

  function handleSelect(optionId) {
    onChange?.(optionId);
    setIsOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.triggerCopy}>
          <Text
            style={[
              styles.triggerText,
              !selectedOption ? styles.placeholderText : null,
            ]}
          >
            {selectedOption?.label || placeholder}
          </Text>
          {selectedOption?.description ? (
            <Text style={styles.triggerDescription} numberOfLines={1}>
              {selectedOption.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down-outline" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || 'Selecciona una opcion'}</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Ionicons name="close-outline" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.optionList}>
              {options.map((option) => {
                const isActive = option.id === value;

                return (
                  <Pressable
                    key={option.id}
                    style={[styles.optionRow, isActive && styles.optionRowActive]}
                    onPress={() => handleSelect(option.id)}
                  >
                    <View style={styles.optionCopy}>
                      <Text
                        style={[
                          styles.optionLabel,
                          isActive && styles.optionLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      ) : null}
                    </View>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    label: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    trigger: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    triggerError: {
      borderColor: colors.danger,
    },
    triggerCopy: {
      flex: 1,
      gap: 2,
    },
    triggerText: {
      ...typography.body,
      color: colors.text,
    },
    placeholderText: {
      color: colors.muted,
    },
    triggerDescription: {
      ...typography.caption,
      color: colors.muted,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '72%',
      overflow: 'hidden',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitle: {
      ...typography.subtitle,
      color: colors.text,
    },
    optionList: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    optionRow: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    optionRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    optionCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    optionLabel: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    optionLabelActive: {
      color: colors.primary,
    },
    optionDescription: {
      ...typography.caption,
      color: colors.muted,
    },
  });
