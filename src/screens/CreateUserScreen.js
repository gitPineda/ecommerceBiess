import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import ErrorBanner from '../components/ErrorBanner';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import brand from '../config/brand.json';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme';

const INITIAL_FORM = {
  names: '',
  lastNames: '',
  email: '',
  password: '',
};

export default function CreateUserScreen({ navigation }) {
  const { addUser, clearAppError } = useAppStore();
  const [form, setForm] = useState(INITIAL_FORM);
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
      addUser({
        name: `${form.names.trim()} ${form.lastNames.trim()}`,
        email: form.email.trim(),
        password: form.password,
        role: brand.roles.customer,
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
              Registra una cuenta cliente para ingresar a la aplicacion.
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

          <View style={styles.rolePanel}>
            <Text style={styles.roleLabel}>Rol asignado por defecto</Text>
            <Text style={styles.roleValue}>{brand.roles.customer}</Text>
          </View>

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

const styles = StyleSheet.create({
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
  rolePanel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  roleLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  roleValue: {
    ...typography.bodyStrong,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  linkText: {
    ...typography.bodyStrong,
    color: colors.primary,
    textAlign: 'center',
  },
});
