import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppSelectInput from '../components/AppSelectInput';
import AppTextInput from '../components/AppTextInput';
import ErrorBanner from '../components/ErrorBanner';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import UserCommercialFields from '../components/UserCommercialFields';
import brand from '../config/brand.json';
import { ROLE_OPTIONS } from '../config/roles';
import { useAppStore } from '../store/AppStore';
import { useThemedStyles } from '../theme';

const INITIAL_FORM = {
  names: '',
  lastNames: '',
  email: '',
  password: '',
  role: brand.roles.customer,
  cedulaRuc: '',
  direccion: '',
  ciudad: '',
  cuentaBancaria: '',
  cuentaPayphone: '',
  verificado: false,
};

export default function CreateUserScreen({ navigation }) {
  const { registerUser, clearAppError } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSeller = form.role === brand.roles.seller;

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validate() {
    if (
      !form.names.trim() ||
      !form.lastNames.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      return 'Completa nombres, apellidos, correo y clave.';
    }

    if (!form.email.includes('@')) {
      return 'Ingresa un correo valido.';
    }

    if (form.password.length < 6) {
      return 'La clave debe tener al menos 6 caracteres.';
    }

    if (
      isSeller &&
      (!form.cedulaRuc.trim() ||
        !form.direccion.trim() ||
        !form.ciudad.trim() ||
        !form.cuentaBancaria.trim() ||
        !form.cuentaPayphone.trim())
    ) {
      return 'Para crear un vendedor completa cedula/RUC, direccion, ciudad, cuenta bancaria y cuenta PayPhone.';
    }

    return '';
  }

  function handleBackToLogin() {
    clearAppError();
    navigation.goBack();
  }

  async function handleCreateUser() {
    clearAppError();
    setError('');

    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSaving(true);

    try {
      await registerUser({
        firstName: form.names.trim(),
        lastName: form.lastNames.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        cedulaRuc: form.cedulaRuc.trim(),
        direccion: form.direccion.trim(),
        ciudad: form.ciudad.trim(),
        cuentaBancaria: form.cuentaBancaria.trim(),
        cuentaPayphone: form.cuentaPayphone.trim(),
        verificado: false,
      });

      navigation.navigate('Login', {
        prefillIdentifier: form.email.trim().toLowerCase(),
        feedback: 'Usuario creado correctamente. Ya puedes iniciar sesion.',
      });
    } catch (saveError) {
      setError(saveError.message || 'No fue posible crear el usuario.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.card}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Crear usuario</Text>
            <Text style={styles.subtitle}>
              Registra una cuenta y selecciona el rol que tendra dentro de la aplicacion.
            </Text>
          </View>

          <ErrorBanner message={error} />

          <AppTextInput
            label="Nombres"
            value={form.names}
            onChangeText={(value) => updateField('names', value)}
            placeholder="Tus nombres"
          />

          <AppTextInput
            label="Apellidos"
            value={form.lastNames}
            onChangeText={(value) => updateField('lastNames', value)}
            placeholder="Tus apellidos"
          />

          <AppTextInput
            label="Correo"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="correo@dominio.com"
          />

          <AppTextInput
            label="Clave"
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Minimo 6 caracteres"
          />

          <AppSelectInput
            label="Rol"
            value={form.role}
            options={ROLE_OPTIONS}
            onChange={(value) => updateField('role', value)}
          />

          <UserCommercialFields
            form={form}
            isSeller={isSeller}
            onChange={updateField}
            showVerification={false}
          />

          <PrimaryButton
            title="Crear usuario"
            onPress={handleCreateUser}
            loading={isSaving}
          />

          <Pressable onPress={handleBackToLogin}>
            <Text style={styles.linkText}>Volver al login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const createStyles = ({ colors, radius, spacing, typography }) =>
  StyleSheet.create({
    content: {
      justifyContent: 'center',
    },
    keyboard: {
      flex: 1,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.lg,
    },
    headerBlock: {
      gap: spacing.sm,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.muted,
    },
    linkText: {
      ...typography.bodyStrong,
      color: colors.primary,
      textAlign: 'center',
    },
  });
