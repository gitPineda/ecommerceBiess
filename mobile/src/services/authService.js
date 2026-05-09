import { isApiMode } from '../config/env';
import { apiRequest, setApiAccessToken } from './apiClient';
import { mapApiUser } from './apiMappers';

const AUTH_DELAY_MS = 350;

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function buildCommercialUserPayload(payload) {
  return {
    cedulaRuc: payload.cedulaRuc?.trim() || undefined,
    direccion: payload.direccion?.trim() || undefined,
    ciudad: payload.ciudad?.trim() || undefined,
    cuentaBancaria: payload.cuentaBancaria?.trim() || undefined,
    cuentaPayphone: payload.cuentaPayphone?.trim() || undefined,
    verificado: Boolean(payload.verificado),
  };
}

function assertRoleScopedUserAvailability(payload, users = []) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();
  const sameRoleUser = users.find(
    (user) =>
      user.role === payload.role &&
      (user.email.toLowerCase() === normalizedEmail ||
        user.username.toLowerCase() === normalizedUsername),
  );

  if (sameRoleUser?.email.toLowerCase() === normalizedEmail) {
    throw new Error('Ya existe un usuario con ese correo y el mismo rol.');
  }

  if (sameRoleUser?.username.toLowerCase() === normalizedUsername) {
    throw new Error('Ya existe un usuario con ese nombre de usuario y el mismo rol.');
  }

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('El correo ya esta registrado en otro rol.');
  }

  if (users.some((user) => user.username.toLowerCase() === normalizedUsername)) {
    throw new Error('El nombre de usuario ya esta registrado en otro rol.');
  }
}

async function authenticateUserWithApi(credentials) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      identifier: (
        credentials.identifier ||
        credentials.username ||
        credentials.email ||
        ''
      ).trim(),
      password: credentials.password,
    },
  });

  return {
    accessToken: response.accessToken,
    user: mapApiUser(response.user),
  };
}

export async function authenticateUser(credentials, users) {
  if (isApiMode()) {
    const session = await authenticateUserWithApi(credentials);
    setApiAccessToken(session.accessToken);
    return session;
  }

  await new Promise((resolve) => setTimeout(resolve, AUTH_DELAY_MS));

  const normalizedIdentifier = (
    credentials.identifier ||
    credentials.username ||
    credentials.email ||
    ''
  )
    .trim()
    .toLowerCase();

  const candidate = users.find(
    (user) =>
      (
        user.username.toLowerCase() === normalizedIdentifier ||
        user.email.toLowerCase() === normalizedIdentifier
      ) &&
      user.password === credentials.password,
  );

  if (!candidate) {
    throw new Error('Credenciales incorrectas. Verifica usuario/correo y clave.');
  }

  return {
    accessToken: '',
    user: sanitizeUser(candidate),
  };
}

export async function restoreSession(session) {
  if (!session?.accessToken) {
    return null;
  }

  if (!isApiMode()) {
    return session;
  }

  setApiAccessToken(session.accessToken);

  try {
    const user = await apiRequest('/users/me', {
      accessToken: session.accessToken,
    });

    return {
      accessToken: session.accessToken,
      user: mapApiUser(user),
    };
  } catch (error) {
    setApiAccessToken('');
    throw error;
  }
}

export async function registerPublicUser(payload, users = []) {
  if (isApiMode()) {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        username: payload.username.trim().toLowerCase(),
        email: payload.email.trim().toLowerCase(),
        phoneNumber: payload.phoneNumber?.trim() || undefined,
        cedulaRuc: payload.cedulaRuc?.trim() || undefined,
        direccion: payload.direccion?.trim() || undefined,
        ciudad: payload.ciudad?.trim() || undefined,
        cuentaBancaria: payload.cuentaBancaria?.trim() || undefined,
        cuentaPayphone: payload.cuentaPayphone?.trim() || undefined,
        password: payload.password,
        role: payload.role,
      },
    });

    return mapApiUser(response.user);
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();
  assertRoleScopedUserAvailability(
    {
      ...payload,
      email: normalizedEmail,
      username: normalizedUsername,
      role: payload.role || 'customer',
    },
    users,
  );

  return {
    id: `usr-${Date.now()}`,
    name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password: payload.password,
    role: payload.role || 'customer',
    cedulaRuc: payload.cedulaRuc?.trim() || '',
    direccion: payload.direccion?.trim() || '',
    ciudad: payload.ciudad?.trim() || '',
    cuentaBancaria: payload.cuentaBancaria?.trim() || '',
    cuentaPayphone: payload.cuentaPayphone?.trim() || '',
    verificado: false,
  };
}

export async function createManagedUser(payload, session, users = []) {
  if (isApiMode()) {
    const response = await apiRequest('/users', {
      method: 'POST',
      accessToken: session?.accessToken,
      body: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        username: payload.username.trim().toLowerCase(),
        email: payload.email.trim().toLowerCase(),
        phoneNumber: payload.phoneNumber?.trim() || undefined,
        ...buildCommercialUserPayload(payload),
        password: payload.password,
        role: payload.role,
      },
    });

    return mapApiUser(response);
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();
  assertRoleScopedUserAvailability(
    {
      ...payload,
      email: normalizedEmail,
      username: normalizedUsername,
    },
    users,
  );

  return {
    id: `usr-${Date.now()}`,
    name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
    cedulaRuc: payload.cedulaRuc?.trim() || '',
    direccion: payload.direccion?.trim() || '',
    ciudad: payload.ciudad?.trim() || '',
    cuentaBancaria: payload.cuentaBancaria?.trim() || '',
    cuentaPayphone: payload.cuentaPayphone?.trim() || '',
    verificado: Boolean(payload.verificado),
  };
}

export async function requestPasswordReset(email) {
  if (isApiMode()) {
    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: {
        email: email.trim().toLowerCase(),
      },
    });

    return response;
  }

  return {
    message: 'Su peticion ha sido enviada a su correo.',
    email: email.trim().toLowerCase(),
  };
}

export async function verifyPasswordResetCode(email, code) {
  if (isApiMode()) {
    return apiRequest('/auth/forgot-password/verify', {
      method: 'POST',
      body: {
        email: email.trim().toLowerCase(),
        code: String(code || '').trim(),
      },
    });
  }

  return {
    message: 'Codigo validado correctamente.',
    resetToken: 'mock-reset-token',
    email: email.trim().toLowerCase(),
  };
}

export async function resetPasswordWithToken(resetToken, newPassword) {
  if (isApiMode()) {
    return apiRequest('/auth/forgot-password/reset', {
      method: 'POST',
      body: {
        resetToken,
        newPassword,
      },
    });
  }

  return {
    message: 'Tu clave fue restablecida correctamente.',
  };
}

export function clearAuthSession() {
  setApiAccessToken('');
}
