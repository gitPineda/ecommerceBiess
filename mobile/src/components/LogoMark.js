import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { brandAssets } from '../config/brandAssets';
import { useAppStore } from '../store/AppStore';
import { useThemedStyles } from '../theme';

const SIZE_MAP = {
  sm: 56,
  md: 76,
  lg: 104,
};

export default function LogoMark({ size = 'md', stacked = false, subtitle }) {
  const { company } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const dimension = SIZE_MAP[size] || SIZE_MAP.md;
  const logoSource = company?.logoDataUri
    ? { uri: company.logoDataUri }
    : brandAssets.logo;

  return (
    <View style={[styles.wrapper, stacked && styles.wrapperStacked]}>
      <View
        style={[
          styles.logoShell,
          {
            width: dimension,
            height: dimension,
            borderRadius: styles.logoShell.borderRadius,
          },
        ]}
      >
        <Image
          source={logoSource}
          style={{
            width: dimension * 0.6,
            height: dimension * 0.6,
          }}
          resizeMode="contain"
        />
      </View>
      <View style={stacked ? styles.textBlockCentered : styles.textBlock}>
        <Text style={styles.title}>{company?.appName}</Text>
        <Text style={styles.subtitle}>{subtitle || company?.tagline}</Text>
      </View>
    </View>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    wrapperStacked: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoShell: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
    },
    textBlock: {
      flex: 1,
      gap: spacing.xs,
    },
    textBlockCentered: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: colors.muted,
      textAlign: 'center',
    },
  });
