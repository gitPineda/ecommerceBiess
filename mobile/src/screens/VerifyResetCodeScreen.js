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

export default function VerifyResetCodeScreen({ navigation, route }) {
  const { verifyResetCode, clearAppError } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVerify() {
    clearAppError();
    setError('');

    if (!email.trim()) {
      setError('Ingresa tu correo para continuar.');
      return;
    }

    if (!email.includes('@')) {
      setError('Ingresa un correo valido.');
      return;
    }

    if (String(code).replace(/\D/g, '').length !== 6) {
      setError('Ingresa el codigo de 6 digitos enviado a tu correo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await verifyResetCode(email, code);
      navigation.replace('ResetPassword', {
        email: response.email || email.trim().toLowerCase(),
        resetToken: response.resetToken,
      });
    } catch (verifyError) {
      setError(verifyError.message || 'No fue posible validar el codigo.');
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
            <Text style={styles.title}>Validar codigo</Text>
            <Text style={styles.subtitle}>
              Revisa tu correo, ingresa el codigo de 6 digitos y continua con el
              cambio de clave.
            </Text>
          </View>

          <ErrorBanner message={error} />

          <AppTextInput
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="correo@dominio.com"
          />

          <AppTextInput
            label="Codigo"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="123456"
          />

          <PrimaryButton
            title="Validar codigo"
            onPress={handleVerify}
            loading={isSubmitting}
          />

          <Pressable onPress={() => navigation.navigate('ForgotPassword', { email })}>
            <Text style={styles.linkText}>Solicitar otro codigo</Text>
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
