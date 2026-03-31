const AUTH_DELAY_MS = 350;

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

export async function authenticateUser(credentials, users) {
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

  return sanitizeUser(candidate);
}
