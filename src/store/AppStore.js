import React, { createContext, useContext, useEffect, useReducer } from 'react';
import brand from '../config/brand.json';
import { authenticateUser } from '../services/authService';
import { bootstrapCatalog } from '../services/catalogService';
import { processCheckout } from '../services/checkoutService';
import { createProductFromPayload } from '../services/productUtils';
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
        const catalog = await bootstrapCatalog(persisted.products, persisted.users);

        if (!isMounted) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_SUCCESS',
          payload: {
            user: persisted.session,
            cartItems: persisted.cartItems,
            products: catalog.products,
            users: catalog.users,
          },
        });
      } catch (error) {
        const fallbackCatalog = await bootstrapCatalog();

        if (!isMounted) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_FAILURE',
          payload: {
            message: error.message || 'No se pudo restaurar el estado persistido.',
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

    persistSession(state.user).catch(() => undefined);
  }, [state.user, state.isBootstrapping]);

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
      const user = await authenticateUser(credentials, state.users);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      return user;
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'No fue posible iniciar sesion.',
      });
      throw error;
    }
  }

  function signOut() {
    dispatch({ type: 'SIGN_OUT' });
  }

  function addProduct(payload) {
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

    const product = createProductFromPayload({
      ...payload,
      name,
      sku,
    });

    dispatch({ type: 'ADD_PRODUCT', payload: product });
    return product;
  }

  function addUser(payload) {
    const username = payload.username.trim().toLowerCase();

    if (state.users.some((user) => user.username.toLowerCase() === username)) {
      throw new Error('El nombre de usuario ya existe.');
    }

    const user = {
      id: `usr-${Date.now()}`,
      name: payload.name.trim(),
      username,
      password: payload.password,
      role: payload.role,
      email: payload.email.trim().toLowerCase(),
    };

    dispatch({ type: 'ADD_USER', payload: user });
    return user;
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
      });

      dispatch({ type: 'CHECKOUT_SUCCESS', payload: order });
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
