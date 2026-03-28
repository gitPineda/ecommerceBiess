import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { useAppStore } from '../../store/AppStore';
import { colors, radius, spacing, typography } from '../../theme';

const INITIAL_FORM = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: brand.roles.customer,
};

export default function UserManagementScreen() {
  const { addUser, users } = useAppStore();
  const [form, setForm] = useState(INITIAL_FORM);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validate() {
    if (!form.name.trim() || !form.username.trim() || !form.email.trim() || !form.password.trim()) {
      return 'Completa nombre, usuario, correo y clave.';
    }

    if (form.password.length < 6) {
      return 'La clave debe tener al menos 6 caracteres.';
    }

    return '';
  }

  function handleSave() {
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      setFeedback('');
      return;
    }

    try {
      addUser(form);
      setForm(INITIAL_FORM);
      setError('');
      setFeedback('Usuario guardado correctamente.');
    } catch (saveError) {
      setError(saveError.message);
      setFeedback('');
    }
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.sectionCard}>
        <Text style={styles.title}>Ingreso de usuarios</Text>
        <Text style={styles.subtitle}>
          Registra administradores o clientes para pruebas del flujo de autenticacion.
        </Text>

        <ErrorBanner message={error || feedback} tone={feedback ? 'success' : 'danger'} />

        <AppTextInput
          label="Nombre completo"
          value={form.name}
          onChangeText={(value) => updateField('name', value)}
          placeholder="Nombre Apellido"
        />
        <AppTextInput
          label="Usuario"
          value={form.username}
          onChangeText={(value) => updateField('username', value)}
          autoCapitalize="none"
          placeholder="usuario"
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
          placeholder="Minimo 6 caracteres"
        />

        <View style={styles.roleSelector}>
          <Text style={styles.roleLabel}>Rol</Text>
          <View style={styles.roleRow}>
            <Pressable
              style={[
                styles.roleChip,
                form.role === brand.roles.customer && styles.roleChipActive,
              ]}
              onPress={() => updateField('role', brand.roles.customer)}
            >
              <Text
                style={[
                  styles.roleChipText,
                  form.role === brand.roles.customer && styles.roleChipTextActive,
                ]}
              >
                Cliente
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.roleChip,
                form.role === brand.roles.admin && styles.roleChipActive,
              ]}
              onPress={() => updateField('role', brand.roles.admin)}
            >
              <Text
                style={[
                  styles.roleChipText,
                  form.role === brand.roles.admin && styles.roleChipTextActive,
                ]}
              >
                Administrador
              </Text>
            </Pressable>
          </View>
        </View>

        <PrimaryButton title="Guardar usuario" onPress={handleSave} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.title}>Usuarios activos</Text>
        <Text style={styles.subtitle}>{users.length} perfiles cargados en la app.</Text>

        {users.map((item) => (
          <View key={item.id} style={styles.userCard}>
            <View style={styles.userCopy}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userMeta}>
                @{item.username} | {item.email}
              </Text>
            </View>
            <View
              style={[
                styles.roleBadge,
                item.role === brand.roles.admin ? styles.adminBadge : styles.clientBadge,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  item.role === brand.roles.admin ? styles.adminBadgeText : styles.clientBadgeText,
                ]}
              >
                {item.role}
              </Text>
            </View>
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
  roleSelector: {
    gap: spacing.sm,
  },
  roleLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  roleChipText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  roleChipTextActive: {
    color: colors.primary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  userCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  userName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  userMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  adminBadge: {
    backgroundColor: '#E7F1FF',
  },
  clientBadge: {
    backgroundColor: '#EAF8EF',
  },
  roleBadgeText: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  adminBadgeText: {
    color: '#1D4ED8',
  },
  clientBadgeText: {
    color: colors.success,
  },
});
