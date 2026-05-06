import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryMeta } from '../config/productCategories';
import { getProductImageUrl } from '../services/productUtils';
import { useAppTheme } from '../theme';

export default function ProductMedia({
  product,
  imageUrl = '',
  variant = 'card',
  width = 72,
  height = 72,
  borderRadius = 16,
  iconSize = 28,
  style,
}) {
  const { colors } = useAppTheme();
  const categoryMeta = getCategoryMeta(
    product?.categoryId,
    product?.category,
    product?.categoryIcon,
  );
  const resolvedImageUrl = imageUrl || getProductImageUrl(product, variant);

  return (
    <View
      style={[
        styles.shell,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceAlt,
        },
        style,
      ]}
    >
      {resolvedImageUrl ? (
        <Image
          source={{ uri: resolvedImageUrl }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name={categoryMeta.icon} size={iconSize} color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
