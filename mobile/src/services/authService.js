import { isApiMode } from '../config/env';
import { apiRequest, setApiAccessToken } from './apiClient';
import { mapApiUser } from './apiMappers';

const AUTH_DELAY_MS = 350;

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
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
        password: payload.password,
      },
    });

    return mapApiUser(response.user);
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('El correo ya existe.');
  }

  if (users.some((user) => user.username.toLowerCase() === normalizedUsername)) {
    throw new Error('El nombre de usuario ya existe.');
  }

  return {
    id: `usr-${Date.now()}`,
    name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password: payload.password,
    role: payload.role || 'customer',
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
        password: payload.password,
        role: payload.role,
      },
    });

    return mapApiUser(response);
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('El correo ya existe.');
  }

  if (users.some((user) => user.username.toLowerCase() === normalizedUsername)) {
    throw new Error('El nombre de usuario ya existe.');
  }

  return {
    id: `usr-${Date.now()}`,
    name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
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

    return response.message;
  }

  return 'Su peticion ha sido enviada a su correo.';
}

export function clearAuthSession() {
  setApiAccessToken('');
}
