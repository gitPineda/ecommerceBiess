const AUTH_DELAY_MS = 350;

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

export async function authenticateUser(credentials, users) {
  await new Promise((resolve) => setTimeout(resolve, AUTH_DELAY_MS));

  const normalizedUsername = credentials.username.trim().toLowerCase();
  const candidate = users.find(
    (user) =>
      user.username.toLowerCase() === normalizedUsername &&
      user.password === credentials.password,
  );

  if (!candidate) {
    throw new Error('Credenciales incorrectas. Verifica usuario y clave.');
  }

  return sanitizeUser(candidate);
}
