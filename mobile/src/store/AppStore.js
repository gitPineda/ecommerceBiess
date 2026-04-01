import React, { createContext, useContext, useEffect, useReducer } from 'react';
import brand from '../config/brand.json';
import { isApiMode } from '../config/env';
import {
  authenticateUser,
  clearAuthSession,
  createManagedUser,
  registerPublicUser,
  requestPasswordReset,
  restoreSession,
} from '../services/authService';
import {
  bootstrapCatalog,
  bootstrapCatalogWithSession,
  createCatalogProduct,
} from '../services/catalogService';
import { processCheckout } from '../services/checkoutService';
import { buildCategoryId, createProductFromPayload } from '../services/productUtils';
import { appReducer, initialState } from './appReducer';
import {
  findProductById,
  getAvailableCategories,
  getCartSummary,
  getCartItemQuantity,
  getLatestProducts,
  getProductPricing,
} from './selectors';
import { loadPersistedState, persistCart, persistCatalog, persistSession } from './storage';

const AppStoreContext = createContext(null);

function buildBaseUsername(email = '') {
  const normalizedBase = email
    .trim()
    .toLowerCase()
    .split('@')[0]
    .replace(/[^a-z0-9._-]/g, '');

  return normalizedBase || 'cliente';
}

function buildUniqueUsername(users, baseUsername) {
  let suffix = 0;
  let candidate = baseUsername;

  while (
    users.some((user) => user.username.toLowerCase() === candidate.toLowerCase())
  ) {
    suffix += 1;
    candidate = `${baseUsername}${suffix}`;
  }

  return candidate;
}

function buildInsufficientStockMessage(product, availableUnits, isAdditional = false) {
  if (availableUnits <= 0) {
    return `No hay stock suficiente de ${product.name}.`;
  }

  if (isAdditional) {
    return `No hay stock suficiente de ${product.name}. Solo puedes agregar ${availableUnits} unidad(es) adicional(es).`;
  }

  return `No hay stock suficiente de ${product.name}. Solo quedan ${availableUnits} unidad(es) disponibles.`;
}

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      dispatch({ type: 'BOOTSTRAP_START' });

      try {
        const persisted = await loadPersistedState();
        const session = isApiMode()
          ? await restoreSession(persisted.session)
          : persisted.session;
        const catalog = isApiMode()
          ? await bootstrapCatalogWithSession(persisted.products, persisted.users, session)
          : await bootstrapCatalog(persisted.products, persisted.users);

        if (!isMounted) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_SUCCESS',
          payload: {
            authToken: session?.accessToken || '',
            user: session?.user || null,
            cartItems: persisted.cartItems,
            products: catalog.products,
            users: catalog.users,
          },
        });
      } catch (error) {
        const fallbackCatalog = isApiMode()
          ? {
              products: [],
              users: [],
            }
          : await bootstrapCatalog();

        if (!isMounted) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_FAILURE',
          payload: {
            message: error.message || 'No se pudo restaurar el estado persistido.',
            authToken: '',
            user: null,
            cartItems: [],
            products: fallbackCatalog.products,
            users: fallbackCatalog.users,
          },
        });
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (state.isBootstrapping) {
      return;
    }

    persistSession(
      state.user
        ? {
            user: state.user,
            accessToken: state.authToken,
          }
        : null,
    ).catch(() => undefined);
  }, [state.user, state.authToken, state.isBootstrapping]);

  useEffect(() => {
    if (state.isBootstrapping) {
      return;
    }

    persistCart(state.cartItems).catch(() => undefined);
  }, [state.cartItems, state.isBootstrapping]);

  useEffect(() => {
    if (state.isBootstrapping || !state.products.length || !state.users.length) {
      return;
    }

    // Product and user persistence makes the mock admin modules useful between reloads.
    persistCatalog(state.products, state.users).catch(() => undefined);
  }, [state.products, state.users, state.isBootstrapping]);

  const cartSummary = getCartSummary(state.cartItems);
  const featuredProducts = state.products.filter((product) => product.featured);
  const latestProducts = getLatestProducts(state.products, 5);
  const productCategories = getAvailableCategories(state.products);

  async function signIn(credentials) {
    dispatch({ type: 'AUTH_START' });

    try {
      const session = await authenticateUser(credentials, state.users);
      const catalog = isApiMode()
        ? await bootstrapCatalogWithSession(state.products, state.users, session)
        : await bootstrapCatalog(state.products, state.users);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          authToken: session.accessToken || '',
          user: session.user,
          products: catalog.products,
          users: isApiMode()
            ? session.user.role === brand.roles.admin
              ? catalog.users
              : [session.user]
            : catalog.users,
        },
      });
      return session.user;
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'No fue posible iniciar sesion.',
      });
      throw error;
    }
  }

  function signOut() {
    clearAuthSession();
    dispatch({ type: 'SIGN_OUT' });
  }

  async function addProduct(payload) {
    const name = payload.name.trim();
    const sku = payload.sku.trim().toUpperCase();

    if (
      state.products.some(
        (product) =>
          product.sku.toLowerCase() === sku.toLowerCase() ||
          product.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error('El producto ya existe. Usa un nombre o SKU distinto.');
    }

    const product = isApiMode()
      ? await createCatalogProduct(
          {
            ...payload,
            name,
            sku,
            categoryId: buildCategoryId(payload.category),
          },
          {
            accessToken: state.authToken,
            user: state.user,
          },
        )
      : createProductFromPayload({
          ...payload,
          name,
          sku,
        });

    dispatch({ type: 'ADD_PRODUCT', payload: product });
    return product;
  }

  async function addUser(payload) {
    const email = payload.email.trim().toLowerCase();
    const requestedUsername = payload.username?.trim().toLowerCase() || '';

    const username = requestedUsername
      ? requestedUsername
      : buildUniqueUsername(state.users, buildBaseUsername(email));

    const [firstName, ...lastNameParts] = payload.name.trim().split(' ');
    const user = isApiMode()
      ? await createManagedUser(
          {
            firstName,
            lastName: lastNameParts.join(' ') || firstName,
            username,
            email,
            password: payload.password,
            role: payload.role || brand.roles.customer,
          },
          {
            accessToken: state.authToken,
            user: state.user,
          },
          state.users,
        )
      : {
          id: `usr-${Date.now()}`,
          name: payload.name.trim(),
          username,
          password: payload.password,
          role: payload.role || brand.roles.customer,
          email,
        };

    dispatch({ type: 'ADD_USER', payload: user });
    return user;
  }

  async function registerUser(payload) {
    const email = payload.email.trim().toLowerCase();
    const baseUsername = payload.username?.trim().toLowerCase() || buildBaseUsername(email);
    const username = isApiMode()
      ? baseUsername
      : buildUniqueUsername(state.users, baseUsername);

    const user = await registerPublicUser(
      {
        firstName: payload.firstName,
        lastName: payload.lastName,
        username,
        email,
        password: payload.password,
        role: brand.roles.customer,
      },
      state.users,
    );

    if (!isApiMode()) {
      dispatch({
        type: 'ADD_USER',
        payload: user,
      });
    }

    return user;
  }

  async function sendPasswordReset(email) {
    return requestPasswordReset(email);
  }

  function addToCart(productId, quantity = 1) {
    const product = findProductById(state.products, productId);

    if (!product) {
      throw new Error('Producto no encontrado.');
    }

    const currentQuantity = getCartItemQuantity(state.cartItems, productId);
    const availableUnits = Math.max(Number(product.stock || 0) - currentQuantity, 0);

    if (availableUnits < quantity) {
      throw new Error(
        buildInsufficientStockMessage(product, availableUnits, currentQuantity > 0),
      );
    }

    const pricing = getProductPricing(product);

    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        product,
        quantity,
        unitPrice: pricing.finalPrice,
      },
    });
  }

  function removeFromCart(productId) {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  }

  function updateCartQuantity(productId, quantity) {
    const product = findProductById(state.products, productId);

    if (!product) {
      return;
    }

    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
      return;
    }

    if (quantity > Number(product.stock || 0)) {
      const currentQuantity = getCartItemQuantity(state.cartItems, productId);
      const availableUnits = Math.max(Number(product.stock || 0) - currentQuantity, 0);
      throw new Error(
        buildInsufficientStockMessage(product, availableUnits, true),
      );
    }

    dispatch({
      type: 'UPDATE_CART_QUANTITY',
      payload: {
        productId,
        quantity,
        maxStock: product.stock,
      },
    });
  }

  function clearCart() {
    dispatch({ type: 'CLEAR_CART' });
  }

  async function checkout(payload) {
    if (!state.cartItems.length) {
      throw new Error('Tu carrito esta vacio.');
    }

    dispatch({ type: 'CHECKOUT_START' });

    try {
      const order = await processCheckout({
        ...payload,
        total: cartSummary.total,
        items: state.cartItems,
      }, {
        accessToken: state.authToken,
        user: state.user,
      });

      let products = state.products;

      if (isApiMode()) {
        const catalog = await bootstrapCatalogWithSession(
          state.products,
          state.users,
          {
            accessToken: state.authToken,
            user: state.user,
          },
        );
        products = catalog.products;
      }

      dispatch({
        type: 'CHECKOUT_SUCCESS',
        payload: {
          order,
          products,
        },
      });
      return order;
    } catch (error) {
      dispatch({
        type: 'CHECKOUT_FAILURE',
        payload: error.message || 'No se pudo completar el pago.',
      });
      throw error;
    }
  }

  function clearAppError() {
    dispatch({ type: 'CLEAR_APP_ERROR' });
  }

  return (
    <AppStoreContext.Provider
      value={{
        state,
        user: state.user,
        products: state.products,
        users: state.users,
        cartItems: state.cartItems,
        orders: state.orders,
        lastOrder: state.lastOrder,
        cartSummary,
        featuredProducts,
        latestProducts,
        productCategories,
        isAuthenticated: Boolean(state.user),
        isAdmin: state.user?.role === brand.roles.admin,
        isCustomer: state.user?.role === brand.roles.customer,
        signIn,
        signOut,
        addProduct,
        addUser,
        registerUser,
        sendPasswordReset,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        checkout,
        clearAppError,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error('useAppStore debe usarse dentro de AppStoreProvider.');
  }

  return context;
}
