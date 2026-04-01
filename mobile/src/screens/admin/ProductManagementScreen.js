import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

const INITIAL_FORM = {
  name: '',
  sku: '',
  category: '',
  price: '',
  stock: '',
  description: '',
  featured: false,
  isPromotion: false,
  promotionDiscount: '',
};

export default function ProductManagementScreen() {
  const { addProduct, products } = useAppStore();
  const [form, setForm] = useState(INITIAL_FORM);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validate() {
    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      !form.category.trim() ||
      !form.description.trim()
    ) {
      return 'Completa nombre, SKU, categoria y descripcion.';
    }

    if (Number(form.price) <= 0 || Number(form.stock) <= 0) {
      return 'El precio y stock deben ser mayores a cero.';
    }

    if (form.isPromotion && (Number(form.promotionDiscount) <= 0 || Number(form.promotionDiscount) > 90)) {
      return 'Si el producto esta en promocion, el descuento debe ser mayor a 0 y menor o igual a 90.';
    }

    return '';
  }

  async function handleSave() {
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      setFeedback('');
      return;
    }

    setIsSaving(true);

    try {
      await addProduct(form);
      setForm(INITIAL_FORM);
      setError('');
      setFeedback('Producto creado correctamente.');
    } catch (saveError) {
      setError(saveError.message);
      setFeedback('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.sectionCard}>
        <Text style={styles.title}>Ingreso de productos</Text>
        <Text style={styles.subtitle}>
          Formulario base para administracion. La lista se usa de inmediato en el modulo cliente.
        </Text>

        <ErrorBanner message={error || feedback} tone={feedback ? 'success' : 'danger'} />

        <AppTextInput
          label="Nombre"
          value={form.name}
          onChangeText={(value) => updateField('name', value)}
          placeholder="Ej. Parlante Nova"
        />
        <AppTextInput
          label="SKU"
          value={form.sku}
          onChangeText={(value) => updateField('sku', value)}
          autoCapitalize="characters"
          placeholder="SKU-001"
        />
        <AppTextInput
          label="Categoria"
          value={form.category}
          onChangeText={(value) => updateField('category', value)}
          placeholder="Audio"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <AppTextInput
              label="Precio"
              value={form.price}
              onChangeText={(value) => updateField('price', value)}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.rowItem}>
            <AppTextInput
              label="Stock"
              value={form.stock}
              onChangeText={(value) => updateField('stock', value)}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        </View>
        <AppTextInput
          label="Descripcion"
          value={form.description}
          onChangeText={(value) => updateField('description', value)}
          multiline
          style={styles.multiline}
          placeholder="Describe el producto"
        />

        <Pressable
          style={[styles.toggle, form.featured && styles.toggleActive]}
          onPress={() => updateField('featured', !form.featured)}
        >
          <Text style={[styles.toggleText, form.featured && styles.toggleTextActive]}>
            {form.featured ? 'Producto destacado: SI' : 'Producto destacado: NO'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.toggle, form.isPromotion && styles.toggleActive]}
          onPress={() => updateField('isPromotion', !form.isPromotion)}
        >
          <Text style={[styles.toggleText, form.isPromotion && styles.toggleTextActive]}>
            {form.isPromotion ? 'Promocion activa: SI' : 'Promocion activa: NO'}
          </Text>
        </Pressable>

        {form.isPromotion ? (
          <AppTextInput
            label="Descuento de promocion (%)"
            value={form.promotionDiscount}
            onChangeText={(value) => updateField('promotionDiscount', value)}
            keyboardType="number-pad"
            placeholder="10"
          />
        ) : null}

        <PrimaryButton title="Guardar producto" onPress={handleSave} loading={isSaving} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.title}>Catalogo actual</Text>
        <Text style={styles.subtitle}>
          {products.length} productos disponibles para clientes.
        </Text>
        {products.slice(0, 6).map((product) => (
          <View key={product.id} style={styles.itemCard}>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{product.name}</Text>
              <Text style={styles.itemMeta}>
                {product.category} | {product.sku} |{' '}
                {product.isPromotion
                  ? `Promo ${product.promotionDiscount}%`
                  : 'Sin promocion'}
              </Text>
            </View>
            <Text style={styles.itemPrice}>{formatCurrency(product.price)}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  multiline: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  toggle: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  itemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  itemMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  itemPrice: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
