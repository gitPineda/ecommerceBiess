import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  session: '@biess/session',
  cart: '@biess/cart',
  products: '@biess/products',
  users: '@biess/users',
};

function safeParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export async function loadPersistedState() {
  const entries = await AsyncStorage.multiGet([
    STORAGE_KEYS.session,
    STORAGE_KEYS.cart,
    STORAGE_KEYS.products,
    STORAGE_KEYS.users,
  ]);

  return {
    session: safeParse(entries[0][1], null),
    cartItems: safeParse(entries[1][1], []),
    products: safeParse(entries[2][1], []),
    users: safeParse(entries[3][1], []),
  };
}

export async function persistSession(session) {
  if (!session) {
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export async function persistCart(cartItems) {
  await AsyncStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cartItems));
}

export async function persistCatalog(products, users) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.products, JSON.stringify(products)],
    [STORAGE_KEYS.users, JSON.stringify(users)],
  ]);
}
