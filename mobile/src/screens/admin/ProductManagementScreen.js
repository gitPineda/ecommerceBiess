import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ProductMedia from '../../components/ProductMedia';
import ScreenContainer from '../../components/ScreenContainer';
import { formatCurrency } from '../../config/formatters';
import { PRODUCT_CATEGORY_ICON_OPTIONS } from '../../config/productCategories';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

const INITIAL_FORM = {
  name: '',
  sku: '',
  sellerId: '',
  categoryId: '',
  price: '',
  stock: '',
  description: '',
  featured: false,
  isPromotion: false,
  promotionDiscount: '',
};

function buildInitialFormForRole(isSeller, userId) {
  return {
    ...INITIAL_FORM,
    sellerId: isSeller ? userId || '' : '',
  };
}

function buildFormFromProduct(product) {
  return {
    name: product.name || '',
    sku: product.sku || '',
    sellerId: product.sellerId || '',
    categoryId: product.categoryId || '',
    price: String(product.price ?? ''),
    stock: String(product.stock ?? ''),
    description: product.description || '',
    featured: Boolean(product.featured),
    isPromotion: Boolean(product.isPromotion),
    promotionDiscount: String(product.promotionDiscount ?? ''),
  };
}

export default function ProductManagementScreen() {
  const {
    addProduct,
    updateProduct,
    categories,
    products,
    users,
    user,
    isAdmin,
    isSeller,
    clearAppError,
  } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [form, setForm] = useState(() => buildInitialFormForRole(isSeller, user?.id));
  const [imageAsset, setImageAsset] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState('');

  const visibleProducts = isSeller
    ? products.filter((item) => item.sellerId === user?.id)
    : products;
  const sellers = users
    .filter((item) => item.role === 'seller')
    .sort((left, right) => left.name.localeCompare(right.name));
  const activeCategories = categories
    .filter((item) => item.isActive !== false)
    .sort(
      (left, right) =>
        Number(left.sortOrder || 0) - Number(right.sortOrder || 0) ||
        left.label.localeCompare(right.label),
    );
  const selectedCategory =
    activeCategories.find((item) => item.id === form.categoryId) || null;
  const editingProduct =
    visibleProducts.find((product) => product.id === editingProductId) || null;
  const isEditing = Boolean(editingProductId);

  useEffect(() => {
    if (isSeller && user?.id && !isEditing) {
      setForm((current) => ({
        ...current,
        sellerId: user.id,
      }));
    }
  }, [isSeller, isEditing, user?.id]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFormState() {
    setForm(buildInitialFormForRole(isSeller, user?.id));
    setImageAsset(null);
    setEditingProductId('');
  }

  function handleEditProduct(product) {
    setForm(buildFormFromProduct(product));
    setImageAsset(null);
    setEditingProductId(product.id);
    setError('');
    setFeedback(`Editando ${product.name}.`);
  }

  function handleCancelEdit() {
    resetFormState();
    setError('');
    setFeedback('Edicion cancelada.');
  }

  async function setSelectedImageAsset(asset) {
    if (!asset?.base64) {
      setError('No fue posible leer la imagen seleccionada.');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    setImageAsset({
      base64: asset.base64,
      mimeType,
      fileName: asset.fileName || asset.name || `producto-${Date.now()}.jpg`,
      previewUri: `data:${mimeType};base64,${asset.base64}`,
    });
    setFeedback('Imagen lista para guardar.');
  }

  async function handlePickImage() {
    clearAppError();
    setError('');
    setFeedback('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Debes conceder permiso para acceder a la galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const selectedAsset = result.assets?.[0];
    await setSelectedImageAsset(selectedAsset);
  }

  async function handlePickImageFromFile() {
    clearAppError();
    setError('');
    setFeedback('');

    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return;
    }

    const selectedAsset = result.assets?.[0];

    if (!selectedAsset?.uri) {
      setError('No fue posible leer el archivo seleccionado.');
      return;
    }

    const base64 = await FileSystem.readAsStringAsync(selectedAsset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await setSelectedImageAsset({
      ...selectedAsset,
      base64,
      fileName: selectedAsset.name,
    });
  }

  function handleClearImage() {
    setImageAsset(null);
    setError('');
    setFeedback('La imagen seleccionada fue removida.');
  }

  function validate() {
    if (!form.name.trim() || !form.sku.trim() || !form.description.trim()) {
      return 'Completa nombre, SKU y descripcion.';
    }

    if (!isEditing && !form.categoryId) {
      return 'Selecciona una categoria para el producto.';
    }

    if (Number(form.price) <= 0) {
      return 'El precio debe ser mayor a cero.';
    }

    if ((!isEditing && Number(form.stock) <= 0) || (isEditing && Number(form.stock) < 0)) {
      return isEditing
        ? 'El stock no puede ser negativo.'
        : 'El stock debe ser mayor a cero.';
    }

    if (!isEditing && isAdmin && !form.sellerId) {
      return 'Selecciona un vendedor para el producto.';
    }

    if (
      !isEditing &&
      form.isPromotion &&
      (Number(form.promotionDiscount) <= 0 || Number(form.promotionDiscount) > 90)
    ) {
      return 'Si el producto esta en promocion, el descuento debe ser mayor a 0 y menor o igual a 90.';
    }

    return '';
  }

  async function handleSave() {
    clearAppError();
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      setFeedback('');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        await updateProduct(editingProductId, {
          name: form.name,
          price: form.price,
          stock: form.stock,
          description: form.description,
        });
        resetFormState();
        setError('');
        setFeedback('Producto actualizado correctamente.');
        return;
      }

      await addProduct({
        ...form,
        sellerId: isSeller ? user?.id || '' : form.sellerId,
        imageBase64: imageAsset?.base64 || '',
        imageMimeType: imageAsset?.mimeType || '',
        imageFileName: imageAsset?.fileName || '',
        imagePreviewUri: imageAsset?.previewUri || '',
      });
      resetFormState();
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
        <Text style={styles.title}>
          {isEditing
            ? 'Actualizar producto'
            : isSeller
              ? 'Mis productos'
              : 'Ingreso de productos'}
        </Text>
        <Text style={styles.subtitle}>
          {isEditing
            ? 'Puedes ajustar nombre, precio, stock y descripcion del producto seleccionado sin alterar su SKU, categoria, vendedor o imagen.'
            : isSeller
              ? 'Crea productos para tu catalogo. Todas las ventas quedaran asociadas a tu usuario vendedor.'
              : 'Como administrador puedes crear productos y asignarlos a un vendedor especifico.'}
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
          editable={!isEditing}
        />

        {!isEditing && isAdmin ? (
          <View style={styles.selectorGroup}>
            <Text style={styles.selectorLabel}>Vendedor</Text>
            <View style={styles.selectorRow}>
              {sellers.map((seller) => (
                <Pressable
                  key={seller.id}
                  style={[
                    styles.sellerChip,
                    form.sellerId === seller.id && styles.sellerChipActive,
                  ]}
                  onPress={() => updateField('sellerId', seller.id)}
                >
                  <Text
                    style={[
                      styles.sellerChipTitle,
                      form.sellerId === seller.id && styles.sellerChipTitleActive,
                    ]}
                  >
                    {seller.name}
                  </Text>
                  <Text style={styles.sellerChipMeta}>@{seller.username}</Text>
                </Pressable>
              ))}
            </View>
            {!sellers.length ? (
              <Text style={styles.emptyHint}>
                No hay vendedores creados. Registra al menos uno antes de crear productos.
              </Text>
            ) : null}
          </View>
        ) : null}

        {!isEditing && isSeller ? (
          <View style={styles.assignedSellerCard}>
            <Text style={styles.selectorLabel}>Vendedor asignado</Text>
            <Text style={styles.assignedSellerName}>{user?.name}</Text>
            <Text style={styles.assignedSellerMeta}>@{user?.username}</Text>
          </View>
        ) : null}

        {!isEditing ? (
          <View style={styles.imagePanel}>
            <View style={styles.imagePreviewShell}>
              <ProductMedia
                product={{
                  categoryId: selectedCategory?.id || 'general',
                  category: selectedCategory?.label || 'General',
                  categoryIcon: selectedCategory?.icon || PRODUCT_CATEGORY_ICON_OPTIONS[0].id,
                }}
                imageUrl={imageAsset?.previewUri || ''}
                variant="detail"
                width={112}
                height={112}
                borderRadius={20}
                iconSize={34}
              />
            </View>
            <View style={styles.imageCopy}>
              <Text style={styles.selectorLabel}>Imagen del producto</Text>
              <Text style={styles.imageHint}>
                Usa una imagen cuadrada o recortala al seleccionar. En emulador, si no tienes galeria disponible, usa Archivo y selecciona una imagen desde Downloads o almacenamiento importado.
              </Text>
              <View style={styles.imageActionRow}>
                <PrimaryButton title="Galeria" onPress={handlePickImage} size="sm" />
                <PrimaryButton
                  title="Archivo"
                  onPress={handlePickImageFromFile}
                  size="sm"
                  tone="secondary"
                />
                <PrimaryButton
                  title="Quitar imagen"
                  onPress={handleClearImage}
                  size="sm"
                  tone="secondary"
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.editingHintCard}>
            <Text style={styles.selectorLabel}>Edicion segura</Text>
            <Text style={styles.imageHint}>
              En este modo solo se actualizan nombre, precio, stock y descripcion.
            </Text>
            {editingProduct?.sellerName ? (
              <Text style={styles.assignedSellerMeta}>
                Vendedor: {editingProduct.sellerName}
              </Text>
            ) : null}
            {editingProduct?.category ? (
              <Text style={styles.assignedSellerMeta}>
                Categoria: {editingProduct.category}
              </Text>
            ) : null}
          </View>
        )}

        {!isEditing ? (
          <View style={styles.selectorGroup}>
            <Text style={styles.selectorLabel}>Categoria</Text>
            <View style={styles.selectorRow}>
              {activeCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    form.categoryId === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => updateField('categoryId', category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipTitle,
                      form.categoryId === category.id && styles.categoryChipTitleActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                  <Text style={styles.categoryChipMeta}>{category.icon}</Text>
                </Pressable>
              ))}
            </View>
            {!activeCategories.length ? (
              <Text style={styles.emptyHint}>
                {isAdmin
                  ? 'No hay categorias. Crea al menos una en el modulo Categorias antes de registrar productos.'
                  : 'No hay categorias activas. Solicita al administrador que cree categorias.'}
              </Text>
            ) : null}
          </View>
        ) : null}

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

        {!isEditing ? (
          <>
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
              <Text
                style={[styles.toggleText, form.isPromotion && styles.toggleTextActive]}
              >
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
          </>
        ) : null}

        <PrimaryButton
          title={isEditing ? 'Actualizar producto' : 'Guardar producto'}
          onPress={handleSave}
          loading={isSaving}
        />
        {isEditing ? (
          <PrimaryButton
            title="Cancelar edicion"
            onPress={handleCancelEdit}
            tone="secondary"
          />
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.title}>{isSeller ? 'Catalogo asignado' : 'Catalogo actual'}</Text>
        <Text style={styles.subtitle}>
          {visibleProducts.length}{' '}
          {isSeller ? 'productos vinculados a tu usuario vendedor.' : 'productos disponibles.'}
        </Text>
        {visibleProducts.slice(0, 12).map((product) => (
          <View key={product.id} style={styles.itemCard}>
            <ProductMedia
              product={product}
              variant="thumb"
              width={64}
              height={64}
              borderRadius={16}
              iconSize={24}
            />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{product.name}</Text>
              <Text style={styles.itemMeta}>
                {product.category} | {product.sku} |{' '}
                {product.isPromotion
                  ? `Promo ${product.promotionDiscount}%`
                  : 'Sin promocion'}
              </Text>
              <Text style={styles.itemSeller}>
                Vendedor: {product.sellerName || 'No asignado'}
              </Text>
            </View>
            <View style={styles.itemAside}>
              <Text style={styles.itemPrice}>{formatCurrency(product.price)}</Text>
              <Text style={styles.itemStock}>Stock {product.stock}</Text>
              <Pressable
                style={styles.editAction}
                onPress={() => handleEditProduct(product)}
              >
                <Text style={styles.editActionText}>Editar</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
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
    selectorGroup: {
      gap: spacing.sm,
    },
    selectorLabel: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    selectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    sellerChip: {
      minWidth: 140,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: spacing.md,
      gap: spacing.xs,
    },
    sellerChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    sellerChipTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    sellerChipTitleActive: {
      color: colors.primary,
    },
    sellerChipMeta: {
      ...typography.caption,
      color: colors.muted,
    },
    categoryChip: {
      minWidth: 132,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: spacing.md,
      gap: spacing.xs,
    },
    categoryChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    categoryChipTitle: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    categoryChipTitleActive: {
      color: colors.primary,
    },
    categoryChipMeta: {
      ...typography.caption,
      color: colors.muted,
    },
    assignedSellerCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    assignedSellerName: {
      ...typography.subtitle,
      color: colors.text,
    },
    assignedSellerMeta: {
      ...typography.caption,
      color: colors.muted,
    },
    editingHintCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    imagePanel: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'center',
    },
    imagePreviewShell: {
      width: 112,
      height: 112,
    },
    imageCopy: {
      flex: 1,
      gap: spacing.sm,
    },
    imageHint: {
      ...typography.caption,
      color: colors.muted,
    },
    imageActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    emptyHint: {
      ...typography.caption,
      color: colors.warning,
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
    itemSeller: {
      ...typography.caption,
      color: colors.primary,
    },
    itemAside: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    itemPrice: {
      ...typography.bodyStrong,
      color: colors.primary,
    },
    itemStock: {
      ...typography.caption,
      color: colors.muted,
    },
    editAction: {
      marginTop: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    editActionText: {
      ...typography.caption,
      color: colors.primary,
    },
  });
