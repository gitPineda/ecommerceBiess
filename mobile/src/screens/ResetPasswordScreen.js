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
import { useAppStore } from '../store/AppStore';
import { useThemedStyles } from '../theme';

export default function ResetPasswordScreen({ navigation, route }) {
  const { resetForgottenPassword, clearAppError } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const resetToken = route.params?.resetToken || '';
  const email = route.params?.email || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReset() {
    clearAppError();
    setError('');
    setFeedback('');

    if (!resetToken) {
      setError('La sesion de recuperacion no es valida.');
      return;
    }

    if (password.trim().length < 8) {
      setError('La nueva clave debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('La confirmacion de clave no coincide.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetForgottenPassword(resetToken, password);
      setFeedback(response.message || 'Tu clave fue restablecida correctamente.');
      navigation.navigate('Login', {
        prefillIdentifier: email,
        feedback: response.message || 'Tu clave fue restablecida correctamente.',
      });
    } catch (resetError) {
      setError(resetError.message || 'No fue posible actualizar la clave.');
    } finally {
      setIsSubmitting(false);
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
            <Text style={styles.title}>Nueva clave</Text>
            <Text style={styles.subtitle}>
              Define una nueva clave segura para tu cuenta.
            </Text>
            {email ? <Text style={styles.meta}>{email}</Text> : null}
          </View>

          <ErrorBanner
            message={feedback || error}
            tone={feedback ? 'success' : 'danger'}
          />

          <AppTextInput
            label="Nueva clave"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Minimo 8 caracteres"
          />

          <AppTextInput
            label="Confirmar clave"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Repite la nueva clave"
          />

          <PrimaryButton
            title="Guardar nueva clave"
            onPress={handleReset}
            loading={isSubmitting}
          />

          <Pressable onPress={() => navigation.navigate('Login')}>
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
    meta: {
      ...typography.bodyStrong,
      color: colors.text,
    },
    linkText: {
      ...typography.bodyStrong,
      color: colors.primary,
      textAlign: 'center',
    },
  });
