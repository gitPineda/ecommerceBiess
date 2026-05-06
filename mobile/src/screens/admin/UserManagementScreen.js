import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppSelectInput from '../../components/AppSelectInput';
import AppTextInput from '../../components/AppTextInput';
import ErrorBanner from '../../components/ErrorBanner';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import brand from '../../config/brand.json';
import { ROLE_OPTIONS, getRoleLabel, isAdminRole } from '../../config/roles';
import { useAppStore } from '../../store/AppStore';
import { useThemedStyles } from '../../theme';

const INITIAL_FORM = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: brand.roles.customer,
};

export default function UserManagementScreen() {
  const { addUser, users } = useAppStore();
  const styles = useThemedStyles(createStyles);
  const [form, setForm] = useState(INITIAL_FORM);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleSave() {
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      setFeedback('');
      return;
    }

    setIsSaving(true);

    try {
      await addUser(form);
      setForm(INITIAL_FORM);
      setError('');
      setFeedback('Usuario guardado correctamente.');
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
        <Text style={styles.title}>Ingreso de usuarios</Text>
        <Text style={styles.subtitle}>
          Registra clientes, vendedores, administradores o superadministradores.
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

        <AppSelectInput
          label="Rol"
          value={form.role}
          options={ROLE_OPTIONS}
          onChange={(value) => updateField('role', value)}
        />

        <PrimaryButton title="Guardar usuario" onPress={handleSave} loading={isSaving} />
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
                item.role === brand.roles.superadmin
                  ? styles.superAdminBadge
                  : isAdminRole(item.role)
                    ? styles.adminBadge
                    : item.role === brand.roles.seller
                    ? styles.sellerBadge
                    : styles.clientBadge,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  item.role === brand.roles.superadmin
                    ? styles.superAdminBadgeText
                    : isAdminRole(item.role)
                      ? styles.adminBadgeText
                      : item.role === brand.roles.seller
                      ? styles.sellerBadgeText
                      : styles.clientBadgeText,
                ]}
              >
                {getRoleLabel(item.role)}
              </Text>
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
      backgroundColor: colors.primarySoft,
    },
    superAdminBadge: {
      backgroundColor: colors.warningSoft,
    },
    clientBadge: {
      backgroundColor: colors.neutralSoft,
    },
    sellerBadge: {
      backgroundColor: colors.surfaceAlt,
    },
    roleBadgeText: {
      ...typography.caption,
      textTransform: 'capitalize',
    },
    adminBadgeText: {
      color: colors.primaryDark,
    },
    superAdminBadgeText: {
      color: colors.warning,
    },
    clientBadgeText: {
      color: colors.success,
    },
    sellerBadgeText: {
      color: colors.secondary,
    },
  });
