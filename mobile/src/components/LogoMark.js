import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import brand from '../config/brand.json';
import { brandAssets } from '../config/brandAssets';
import { colors, radius, spacing, typography } from '../theme';

const SIZE_MAP = {
  sm: 56,
  md: 76,
  lg: 104,
};

export default function LogoMark({ size = 'md', stacked = false, subtitle }) {
  const dimension = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <View style={[styles.wrapper, stacked && styles.wrapperStacked]}>
      <View
        style={[
          styles.logoShell,
          {
            width: dimension,
            height: dimension,
            borderRadius: radius.lg,
          },
        ]}
      >
        <Image
          source={brandAssets.logo}
          style={{
            width: dimension * 0.6,
            height: dimension * 0.6,
          }}
          resizeMode="contain"
        />
      </View>
      <View style={stacked ? styles.textBlockCentered : styles.textBlock}>
        <Text style={styles.title}>{brand.appName}</Text>
        <Text style={styles.subtitle}>{subtitle || brand.tagline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
