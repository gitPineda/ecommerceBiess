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
import { colors, radius, spacing, typography } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { sendPasswordReset, clearAppError } = useAppStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSend() {
    clearAppError();
    setError('');
    setFeedback('');

    if (!email.trim()) {
      setError('Ingresa tu correo para continuar.');
      return;
    }

    if (!email.includes('@')) {
      setError('Ingresa un correo valido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setFeedback('Su peticion ha sido enviada a su correo.');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible enviar la solicitud.');
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
            <Text style={styles.title}>Recuperar contrasena</Text>
            <Text style={styles.subtitle}>
              Ingresa tu correo y envia la solicitud de recuperacion.
            </Text>
          </View>

          <ErrorBanner message={feedback || error} tone={feedback ? 'success' : 'danger'} />

          <AppTextInput
            label="Correo"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (feedback) {
                setFeedback('');
              }
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="correo@dominio.com"
          />

          <PrimaryButton title="Enviar" onPress={handleSend} loading={isSubmitting} />

          <Pressable onPress={() => navigation.goBack()}>
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
  linkText: {
    ...typography.bodyStrong,
    color: colors.primary,
    textAlign: 'center',
  },
});
