import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme';

function buildCustomerDisplayName(user) {
  const baseName = user?.name || '';
  const trimmedName = String(baseName).trim();

  if (!trimmedName) {
    return 'Cliente';
  }

  const parts = trimmedName.split(/\s+/).filter(Boolean);

  if (parts.length <= 2) {
    return trimmedName;
  }

  return `${parts[0]} ${parts[1]}`;
}

export default function CompactCustomerHeader({ user, onNotificationsPress }) {
  const styles = useThemedStyles(createStyles);
  const displayName = buildCustomerDisplayName(user);

  return (
    <View style={styles.wrapper}>
      <View style={styles.identityBlock}>
        <Text style={styles.caption}>Cliente</Text>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notificaciones"
        onPress={onNotificationsPress}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      >
        <Ionicons name="notifications-outline" size={20} style={styles.icon} />
      </Pressable>
    </View>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    identityBlock: {
      flex: 1,
      gap: 2,
    },
    caption: {
      ...typography.caption,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    name: {
      ...typography.subtitle,
      color: colors.text,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      opacity: 0.85,
    },
    icon: {
      color: colors.text,
    },
  });
