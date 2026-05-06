import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { PRODUCT_CATEGORY_ICON_OPTIONS } from '../../config/productCategories';
import { useAppStore } from '../../store/AppStore';
import { useAppTheme, useThemedStyles } from '../../theme';

const INITIAL_FORM = {
  name: '',
  icon: PRODUCT_CATEGORY_ICON_OPTIONS[0].id,
  description: '',
  sortOrder: '',
};

export default function CategoryManagementScreen() {
  const { colors } = useAppTheme();
  const {
    categories,
    addCategory,
    loadManagedProductCategories,
    clearAppError,
  } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadManagedProductCategories().catch(() => undefined);
  }, []);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validate() {
    if (!form.name.trim()) {
      return 'Ingresa el nombre de la categoria.';
    }

    if (!form.icon.trim()) {
      return 'Selecciona un icono para la categoria.';
    }

    return '';
  }

  async function handleSave() {
    clearAppError();
    setError('');
    setFeedback('');

    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSaving(true);

    try {
      await addCategory(form);
      setForm(INITIAL_FORM);
      setFeedback('Categoria creada correctamente.');
    } catch (saveError) {
      setError(saveError.message || 'No fue posible crear la categoria.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.sectionCard}>
        <Text style={styles.title}>Ingreso de categorias</Text>
        <Text style={styles.subtitle}>
          El administrador define aqui las categorias que luego usaran productos, catalogo y filtros.
        </Text>

        <ErrorBanner message={error || feedback} tone={feedback ? 'success' : 'danger'} />

        <AppTextInput
          label="Nombre"
          value={form.name}
          onChangeText={(value) => updateField('name', value)}
          placeholder="Ej. Audio"
        />
        <AppTextInput
          label="Descripcion"
          value={form.description}
          onChangeText={(value) => updateField('description', value)}
          placeholder="Opcional"
        />
        <AppTextInput
          label="Orden"
          value={form.sortOrder}
          onChangeText={(value) => updateField('sortOrder', value)}
          keyboardType="number-pad"
          placeholder="0"
        />

        <View style={styles.iconSelector}>
          <Text style={styles.selectorLabel}>Icono</Text>
          <View style={styles.iconGrid}>
            {PRODUCT_CATEGORY_ICON_OPTIONS.map((item) => {
              const isActive = form.icon === item.id;

              return (
                <Pressable
                  key={item.id}
                  style={[styles.iconChip, isActive && styles.iconChipActive]}
                  onPress={() => updateField('icon', item.id)}
                >
                  <Ionicons
                    name={item.id}
                    size={22}
                    color={isActive ? colors.primary : colors.text}
                  />
                  <Text
                    style={[styles.iconChipText, isActive && styles.iconChipTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton title="Guardar categoria" onPress={handleSave} loading={isSaving} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.title}>Categorias registradas</Text>
        <Text style={styles.subtitle}>{categories.length} categorias cargadas.</Text>

        {categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryLead}>
              <View style={styles.categoryIconShell}>
                <Ionicons name={category.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryName}>{category.label}</Text>
                <Text style={styles.categoryMeta}>
                  {category.id} | orden {category.sortOrder}
                </Text>
                {category.description ? (
                  <Text style={styles.categoryMeta}>{category.description}</Text>
                ) : null}
              </View>
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
    iconSelector: {
      gap: spacing.sm,
    },
    selectorLabel: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    iconChip: {
      minWidth: 130,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: spacing.md,
      gap: spacing.xs,
      alignItems: 'center',
    },
    iconChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    iconChipText: {
      ...typography.caption,
      color: colors.text,
      textAlign: 'center',
    },
    iconChipTextActive: {
      color: colors.primary,
    },
    categoryCard: {
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    categoryLead: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    categoryIconShell: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    categoryCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    categoryName: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    categoryMeta: {
      ...typography.caption,
      color: colors.muted,
    },
  });
