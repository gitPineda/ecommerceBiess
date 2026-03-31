import React, { useEffect, useState } from 'react';
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
import LogoMark from '../components/LogoMark';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import brand from '../config/brand.json';
import { useAppStore } from '../store/AppStore';
import { colors, radius, spacing, typography } from '../theme';

export default function LoginScreen({ navigation, route }) {
  const { signIn, state, clearAppError } = useAppStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!route?.params) {
      return;
    }

    if (route.params.prefillIdentifier) {
      setIdentifier(route.params.prefillIdentifier);
    }

    if (route.params.feedback) {
      setFeedback(route.params.feedback);
    }

    navigation.setParams({
      prefillIdentifier: undefined,
      feedback: undefined,
    });
  }, [navigation, route?.params]);

  function fillDemo(role) {
    setIdentifier(brand.demoCredentials[role].username);
    setPassword(brand.demoCredentials[role].password);
    setError('');
    setFeedback('');
    clearAppError();
  }

  async function handleLogin() {
    clearAppError();
    setError('');
    setFeedback('');

    if (!identifier.trim() || !password.trim()) {
      setError('Ingresa usuario o correo y clave para continuar.');
      return;
    }

    try {
      await signIn({ identifier, password });
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.hero}>
          <View style={styles.orbPrimary} />
          <View style={styles.orbSecondary} />
          <LogoMark size="lg" subtitle={brand.welcomeMessage} />
        </View>

        <View style={styles.card}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Inicia sesion</Text>
            <Text style={styles.subtitle}>
              La autenticacion valida credenciales y rol antes de liberar el acceso.
            </Text>
          </View>

          <ErrorBanner
            message={feedback || error || state.appError}
            tone={feedback ? 'success' : 'danger'}
          />

          <AppTextInput
            label="Usuario o correo"
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              if (feedback) {
                setFeedback('');
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ej. admin o correo@dominio.com"
          />

          <AppTextInput
            label="Clave"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (feedback) {
                setFeedback('');
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Ingresa tu clave"
          />

          <PrimaryButton
            title="Entrar"
            onPress={handleLogin}
            loading={state.isAuthenticating}
          />

          <View style={styles.authActions}>
            <Pressable onPress={() => navigation.navigate('CreateUser')}>
              <Text style={styles.authActionText}>Crear usuario</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.authActionText}>Recuperar contrasena</Text>
            </Pressable>
          </View>

          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>Credenciales demo</Text>
            <View style={styles.demoGrid}>
              <Pressable style={styles.demoCard} onPress={() => fillDemo('admin')}>
                <Text style={styles.demoTitle}>Administrador</Text>
                <Text style={styles.demoText}>admin / Admin123*</Text>
              </Pressable>
              <Pressable style={styles.demoCard} onPress={() => fillDemo('customer')}>
                <Text style={styles.demoTitle}>Cliente</Text>
                <Text style={styles.demoText}>cliente / Cliente123*</Text>
              </Pressable>
            </View>
          </View>
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
    gap: spacing.xxl,
    justifyContent: 'center',
  },
  hero: {
    minHeight: 220,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.xxl,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbPrimary: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#BFE7E1',
  },
  orbSecondary: {
    position: 'absolute',
    bottom: -25,
    left: -15,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FCD4BA',
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
  demoSection: {
    gap: spacing.md,
  },
  authActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  authActionText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  demoLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  demoCard: {
    flex: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  demoTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  demoText: {
    ...typography.caption,
    color: colors.muted,
  },
});
