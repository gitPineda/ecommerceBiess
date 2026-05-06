import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import LogoMark from '../../components/LogoMark';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import ThemeSelectorCard from '../../components/ThemeSelectorCard';
import { brandAssets } from '../../config/brandAssets';
import { formatDateTime } from '../../config/formatters';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

function buildForm(company) {
  return {
    appName: company?.appName || '',
    shortName: company?.shortName || '',
    slug: company?.slug || '',
    tagline: company?.tagline || '',
    welcomeTitle: company?.welcomeTitle || '',
    welcomeMessage: company?.welcomeMessage || '',
    supportEmail: company?.supportEmail || '',
    currency: company?.currency || '',
    currencySymbol: company?.currencySymbol || '',
    defaultLocale: company?.defaultLocale || '',
    vatPercent: String(Number(company?.vatPercent ?? 15)),
    logoText: company?.logoText || '',
  };
}

function buildSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export default function SettingsScreen() {
  const { company, user, saveCompany, signOut, clearAppError } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [form, setForm] = useState(() => buildForm(company));
  const [logoAsset, setLogoAsset] = useState(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(buildForm(company));
    setLogoAsset(null);
    setClearLogo(false);
  }, [company]);

  const previewUri = useMemo(() => {
    if (clearLogo) {
      return null;
    }

    return logoAsset?.previewUri || company?.logoDataUri || null;
  }, [clearLogo, company?.logoDataUri, logoAsset]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validate() {
    if (
      !form.appName.trim() ||
      !form.shortName.trim() ||
      !form.slug.trim() ||
      !form.tagline.trim() ||
      !form.welcomeTitle.trim() ||
      !form.welcomeMessage.trim() ||
      !form.supportEmail.trim() ||
      !form.currency.trim() ||
      !form.currencySymbol.trim() ||
      !form.defaultLocale.trim() ||
      !form.vatPercent.trim() ||
      !form.logoText.trim()
    ) {
      return 'Completa todos los campos de la empresa.';
    }

    if (!form.supportEmail.includes('@')) {
      return 'Ingresa un correo de soporte valido.';
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return 'El slug solo puede usar letras minusculas, numeros y guiones.';
    }

    if (!/^\d+$/.test(form.vatPercent.trim())) {
      return 'El IVA debe ingresarse como numero entero, por ejemplo 15.';
    }

    const numericVatPercent = Number.parseInt(form.vatPercent.trim(), 10);

    if (numericVatPercent < 0 || numericVatPercent > 100) {
      return 'El IVA debe estar entre 0 y 100.';
    }

    return '';
  }

  async function handlePickLogo() {
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

    if (!selectedAsset?.base64) {
      setError('No fue posible leer la imagen seleccionada.');
      return;
    }

    const mimeType = selectedAsset.mimeType || 'image/jpeg';
    setLogoAsset({
      base64: selectedAsset.base64,
      mimeType,
      fileName: selectedAsset.fileName || `logo-${Date.now()}.jpg`,
      previewUri: `data:${mimeType};base64,${selectedAsset.base64}`,
    });
    setClearLogo(false);
    setFeedback('Logo listo para guardar.');
  }

  function handleClearLogo() {
    setLogoAsset(null);
    setClearLogo(true);
    setFeedback('El logo personalizado se eliminara cuando guardes los cambios.');
    setError('');
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
      const updatedCompany = await saveCompany({
        ...form,
        logoBase64: logoAsset?.base64 || '',
        logoMimeType: logoAsset?.mimeType || '',
        logoFileName: logoAsset?.fileName || '',
        logoPreviewUri: logoAsset?.previewUri || '',
        vatPercent: Number.parseInt(form.vatPercent.trim(), 10),
        clearLogo,
      });

      setForm(buildForm(updatedCompany));
      setLogoAsset(null);
      setClearLogo(false);
      setFeedback('Configuracion de empresa actualizada correctamente.');
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar la empresa.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>White label de la empresa</Text>
        <Text style={styles.text}>
          Solo el administrador puede cambiar nombre, logo y textos globales del aplicativo.
        </Text>
        <Text style={styles.text}>Sesion actual: {user?.name}</Text>
        {company?.updatedAt ? (
          <Text style={styles.text}>
            Ultima actualizacion: {formatDateTime(company.updatedAt)}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Logo y nombre</Text>
        <ErrorBanner
          message={feedback || error}
          tone={feedback ? 'success' : 'danger'}
        />

        <View style={styles.logoPanel}>
          <View style={styles.logoPreviewShell}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.logoPreview} resizeMode="contain" />
            ) : (
              <Image source={brandAssets.logo} style={styles.logoPreview} resizeMode="contain" />
            )}
          </View>
          <View style={styles.logoCopy}>
            <Text style={styles.logoLabel}>Vista previa</Text>
            <Text style={styles.logoHint}>
              Si no subes un logo nuevo, se mantiene el actual guardado en la empresa.
            </Text>
            <View style={styles.logoActionRow}>
              <PrimaryButton title="Elegir logo" onPress={handlePickLogo} size="sm" />
              <PrimaryButton
                title="Quitar logo"
                onPress={handleClearLogo}
                size="sm"
                tone="secondary"
              />
            </View>
          </View>
        </View>

        <AppTextInput
          label="Nombre del aplicativo"
          value={form.appName}
          onChangeText={(value) => updateField('appName', value)}
          placeholder="Nombre comercial"
        />
        <AppTextInput
          label="Nombre corto"
          value={form.shortName}
          onChangeText={(value) => updateField('shortName', value)}
          placeholder="Sigla corta"
        />
        <AppTextInput
          label="Texto alterno del logo"
          value={form.logoText}
          onChangeText={(value) => updateField('logoText', value)}
          placeholder="Texto corto para marca"
        />
        <AppTextInput
          label="Slug"
          value={form.slug}
          onChangeText={(value) => updateField('slug', buildSlug(value))}
          autoCapitalize="none"
          placeholder="mi-marca-app"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mensajes de marca</Text>
        <AppTextInput
          label="Tagline"
          value={form.tagline}
          onChangeText={(value) => updateField('tagline', value)}
          placeholder="Frase corta de marca"
        />
        <AppTextInput
          label="Titulo de bienvenida"
          value={form.welcomeTitle}
          onChangeText={(value) => updateField('welcomeTitle', value)}
          placeholder="Titulo de splash"
        />
        <AppTextInput
          label="Mensaje de bienvenida"
          value={form.welcomeMessage}
          onChangeText={(value) => updateField('welcomeMessage', value)}
          multiline
          style={styles.multiline}
          placeholder="Mensaje principal del login o splash"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos operativos</Text>
        <AppTextInput
          label="Correo de soporte"
          value={form.supportEmail}
          onChangeText={(value) => updateField('supportEmail', value)}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="soporte@dominio.com"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <AppTextInput
              label="Moneda"
              value={form.currency}
              onChangeText={(value) => updateField('currency', value.toUpperCase())}
              autoCapitalize="characters"
              placeholder="USD"
            />
          </View>
          <View style={styles.rowItem}>
            <AppTextInput
              label="Simbolo"
              value={form.currencySymbol}
              onChangeText={(value) => updateField('currencySymbol', value)}
              placeholder="$"
            />
          </View>
        </View>
        <AppTextInput
          label="Locale por defecto"
          value={form.defaultLocale}
          onChangeText={(value) => updateField('defaultLocale', value)}
          autoCapitalize="none"
          placeholder="es-EC"
        />
        <AppTextInput
          label="IVA (%)"
          value={form.vatPercent}
          onChangeText={(value) =>
            updateField('vatPercent', value.replace(/[^\d]/g, ''))
          }
          keyboardType="number-pad"
          placeholder="15"
        />
      </View>

      <ThemeSelectorCard />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Marca aplicada</Text>
        <LogoMark subtitle={form.tagline} />
      </View>

      <PrimaryButton
        title="Guardar empresa"
        onPress={handleSave}
        loading={isSaving}
      />
      <PrimaryButton title="Cerrar sesion" tone="danger" onPress={signOut} />
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      gap: spacing.md,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: colors.text,
    },
    text: {
      ...typography.body,
      color: colors.muted,
    },
    logoPanel: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'center',
    },
    logoPreviewShell: {
      width: 104,
      height: 104,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoPreview: {
      width: 72,
      height: 72,
    },
    logoCopy: {
      flex: 1,
      gap: spacing.sm,
    },
    logoLabel: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    logoHint: {
      ...typography.caption,
      color: colors.muted,
    },
    logoActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    rowItem: {
      flex: 1,
    },
    multiline: {
      minHeight: 96,
      paddingTop: spacing.md,
      textAlignVertical: 'top',
    },
  });
