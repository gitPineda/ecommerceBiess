import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  session: '@biess/session',
  cart: '@biess/cart',
  products: '@biess/products',
  users: '@biess/users',
  categories: '@biess/categories',
  orders: '@biess/orders',
  lastOrder: '@biess/last-order',
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
    STORAGE_KEYS.categories,
    STORAGE_KEYS.orders,
    STORAGE_KEYS.lastOrder,
  ]);

  return {
    session: safeParse(entries[0][1], null),
    cartItems: safeParse(entries[1][1], []),
    products: safeParse(entries[2][1], []),
    users: safeParse(entries[3][1], []),
    categories: safeParse(entries[4][1], []),
    orders: safeParse(entries[5][1], []),
    lastOrder: safeParse(entries[6][1], null),
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

export async function persistCatalog(products, users, categories = []) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.products, JSON.stringify(products)],
    [STORAGE_KEYS.users, JSON.stringify(users)],
    [STORAGE_KEYS.categories, JSON.stringify(categories)],
  ]);
}

export async function persistOrders(orders = [], lastOrder = null) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.orders, JSON.stringify(orders)],
    [STORAGE_KEYS.lastOrder, JSON.stringify(lastOrder)],
  ]);
}
