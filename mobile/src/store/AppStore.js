import React, { createContext, useContext, useEffect, useReducer } from 'react';
import brand from '../config/brand.json';
import { getDefaultCompanyConfig } from '../config/company';
import { isApiMode } from '../config/env';
import { isAdminRole } from '../config/roles';
import {
  authenticateUser,
  clearAuthSession,
  createManagedUser,
  registerPublicUser,
  resetPasswordWithToken,
  requestPasswordReset,
  restoreSession,
  verifyPasswordResetCode,
} from '../services/authService';
import { listAudits } from '../services/auditService';
import {
  createProductCategory,
  listManagedCategories,
} from '../services/categoryService';
import { loadCompanyConfig, updateCompanyConfig } from '../services/companyService';
import {
  bootstrapCatalog,
  bootstrapCatalogWithSession,
  createCatalogProduct,
  updateCatalogProduct,
} from '../services/catalogService';
import {
  listCurrentOrders,
  processCheckout,
  rateOrderProducts,
  refreshOrderPaymentStatus as refreshOrderPaymentStatusRequest,
} from '../services/checkoutService';
import {
  acceptCashOnDeliveryOrder as acceptCashOnDeliveryOrderRequest,
  confirmCashOnDeliveryPayment as confirmCashOnDeliveryPaymentRequest,
  confirmCashOnDeliveryWithOtp as confirmCashOnDeliveryWithOtpRequest,
  listAssignedCashOnDeliveryOrders,
  markCashOnDeliveryInPreparation as markCashOnDeliveryInPreparationRequest,
  markCashOnDeliveryInTransit as markCashOnDeliveryInTransitRequest,
  rateCustomerForOrder as rateCustomerForOrderRequest,
  rejectCashOnDeliveryOrder as rejectCashOnDeliveryOrderRequest,
} from '../services/orderService';
import { createProductFromPayload } from '../services/productUtils';
import { listSellerSales } from '../services/salesService';
import { appReducer, initialState } from './appReducer';
import {
  findProductById,
  getCartSummary,
  getCartItemQuantity,
  getLatestProducts,
  getProductPricing,
} from './selectors';
import {
  loadPersistedState,
  persistCart,
  persistCatalog,
  persistOrders,
  persistSession,
} from './storage';

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

function mergeOrderList(orders = [], order) {
  if (!order?.id) {
    return orders;
  }

  const filteredOrders = orders.filter((currentOrder) => currentOrder.id !== order.id);
  return [order, ...filteredOrders];
}

function buildActiveSession(state) {
  return {
    accessToken: state.authToken,
    user: state.user,
  };
}

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      dispatch({ type: 'BOOTSTRAP_START' });
      let persisted = {
        session: null,
        cartItems: [],
        products: [],
        users: [],
        categories: [],
      };

      try {
        persisted = await loadPersistedState();
        const company = await loadCompanyConfig().catch(() => getDefaultCompanyConfig());
        const session = isApiMode()
          ? await restoreSession(persisted.session)
          : persisted.session;
        const catalog = isApiMode()
          ? await bootstrapCatalogWithSession(
              persisted.products,
              persisted.users,
              persisted.categories,
              session,
            )
          : await bootstrapCatalog(
              persisted.products,
              persisted.users,
              persisted.categories,
            );
        let orders = persisted.orders || [];
        let lastOrder = persisted.lastOrder || null;
        let sellerOrders = [];

        if (isApiMode() && session?.accessToken && session?.user?.role === brand.roles.customer) {
          try {
            const remoteOrders = await listCurrentOrders({
              accessToken: session.accessToken,
              user: session.user,
            });
            orders = remoteOrders;
            lastOrder = remoteOrders[0] || lastOrder;
          } catch {
            // Keep persisted orders if backend listing is not available.
          }
        }

        if (
          isApiMode() &&
          session?.accessToken &&
          lastOrder?.id &&
          lastOrder?.paymentProvider === 'payphone' &&
          (lastOrder?.paymentStatus === 'pending' ||
            lastOrder?.status === 'pending_payment')
        ) {
          try {
            const refreshedOrder = await refreshOrderPaymentStatusRequest(lastOrder.id, {
              accessToken: session.accessToken,
              user: session.user,
            });
            lastOrder = refreshedOrder;
            orders = mergeOrderList(orders, refreshedOrder);
          } catch {
            // Keep the persisted order if PayPhone cannot be refreshed during bootstrap.
          }
        }

        if (isApiMode() && session?.accessToken && session?.user?.role === brand.roles.seller) {
          try {
            sellerOrders = await listAssignedCashOnDeliveryOrders({
              accessToken: session.accessToken,
              user: session.user,
            });
          } catch {
            sellerOrders = [];
          }
        }

        if (!isMounted) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_SUCCESS',
          payload: {
            authToken: session?.accessToken || '',
            user: session?.user || null,
            company,
            cartItems: persisted.cartItems,
            products: catalog.products,
            categories: catalog.categories,
            users: catalog.users,
            audits: [],
            sellerSales: [],
            sellerOrders,
            orders,
            lastOrder,
          },
        });
      } catch (error) {
          const fallbackCatalog = isApiMode()
            ? {
                products: [],
                categories: [],
                users: [],
              }
            : await bootstrapCatalog([], [], persisted.categories);
        const company = await loadCompanyConfig().catch(() => getDefaultCompanyConfig());

        if (!isMounted) {
          return;
        }

        dispatch({
          type: 'BOOTSTRAP_FAILURE',
          payload: {
            message: error.message || 'No se pudo restaurar el estado persistido.',
            authToken: '',
            user: null,
            company,
            cartItems: [],
            products: fallbackCatalog.products,
            categories: fallbackCatalog.categories,
            users: fallbackCatalog.users,
            audits: [],
            sellerSales: [],
            sellerOrders: [],
            orders: persisted.orders || [],
            lastOrder: persisted.lastOrder || null,
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
    if (
      state.isBootstrapping ||
      (!state.products.length && !state.users.length && !state.categories.length)
    ) {
      return;
    }

    // Product and user persistence makes the mock admin modules useful between reloads.
    persistCatalog(state.products, state.users, state.categories).catch(() => undefined);
  }, [state.products, state.users, state.categories, state.isBootstrapping]);

  useEffect(() => {
    if (state.isBootstrapping) {
      return;
    }

    persistOrders(state.orders, state.lastOrder).catch(() => undefined);
  }, [state.orders, state.lastOrder, state.isBootstrapping]);

  const cartSummary = getCartSummary(state.cartItems, state.company);
  const featuredProducts = state.products.filter((product) => product.featured);
  const latestProducts = getLatestProducts(state.products, 5);
  const productCategories = state.categories
    .filter((category) => category.isActive !== false)
    .map((category) => ({
      ...category,
      count: state.products.filter((product) => product.categoryId === category.id).length,
    }))
    .sort(
      (left, right) =>
        Number(left.sortOrder || 0) - Number(right.sortOrder || 0) ||
        left.label.localeCompare(right.label),
    );

  async function signIn(credentials) {
    dispatch({ type: 'AUTH_START' });

    try {
      const session = await authenticateUser(credentials, state.users);
      const catalog = isApiMode()
        ? await bootstrapCatalogWithSession(
            state.products,
            state.users,
            state.categories,
            session,
        )
        : await bootstrapCatalog(state.products, state.users, state.categories);
      const orders =
        isApiMode() && session.user.role === brand.roles.customer
          ? await listCurrentOrders(session).catch(() => [])
          : [];
      const sellerOrders =
        isApiMode() && session.user.role === brand.roles.seller
          ? await listAssignedCashOnDeliveryOrders(session).catch(() => [])
          : [];

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          authToken: session.accessToken || '',
          user: session.user,
          company: state.company,
          products: catalog.products,
          categories: catalog.categories,
          users: isApiMode()
            ? isAdminRole(session.user.role)
              ? catalog.users
              : [session.user]
            : catalog.users,
          orders,
          lastOrder: orders[0] || null,
          audits: [],
          sellerSales: [],
          sellerOrders,
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

  async function saveCompany(payload) {
    if (!isAdminRole(state.user?.role)) {
      throw new Error('Solo el administrador puede actualizar la empresa.');
    }

    const company = await updateCompanyConfig(payload, {
      accessToken: state.authToken,
      user: state.user,
    });

    dispatch({
      type: 'SET_COMPANY',
      payload: company,
    });

    return company;
  }

  async function addProduct(payload) {
    const name = payload.name.trim();
    const sku = payload.sku.trim().toUpperCase();
    const selectedCategory = state.categories.find(
      (category) => category.id === payload.categoryId,
    );
    const assignedSeller =
      state.user?.role === brand.roles.seller
        ? state.user
        : state.users.find((user) => user.id === payload.sellerId);

    if (
      state.products.some(
        (product) =>
          product.sku.toLowerCase() === sku.toLowerCase() ||
          product.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error('El producto ya existe. Usa un nombre o SKU distinto.');
    }

    if (!selectedCategory) {
      throw new Error('Selecciona una categoria valida para el producto.');
    }

    const product = isApiMode()
      ? await createCatalogProduct(
          {
            ...payload,
            name,
            sku,
            sellerId: payload.sellerId || undefined,
            categoryId: payload.categoryId,
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
          sellerId: assignedSeller?.id || payload.sellerId || '',
          sellerName: assignedSeller?.name || '',
          sellerUsername: assignedSeller?.username || '',
          sellerEmail: assignedSeller?.email || '',
          category: selectedCategory.label,
          categoryId: selectedCategory.id,
          categoryIcon: selectedCategory.icon,
        });

    dispatch({ type: 'ADD_PRODUCT', payload: product });
    return product;
  }

  async function updateProduct(productId, payload) {
    const currentProduct = state.products.find((product) => product.id === productId);

    if (!currentProduct) {
      throw new Error('Producto no encontrado.');
    }

    const normalizedName = payload.name.trim();
    const hasDuplicateName = state.products.some(
      (product) =>
        product.id !== productId &&
        product.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );

    if (hasDuplicateName) {
      throw new Error('Ya existe otro producto con ese nombre.');
    }

    const updatedProduct = await updateCatalogProduct(
      productId,
      {
        ...payload,
        currentProduct,
      },
      {
        accessToken: state.authToken,
        user: state.user,
      },
    );

    dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct });
    return updatedProduct;
  }

  async function addCategory(payload) {
    const category = await createProductCategory(payload, {
      accessToken: state.authToken,
      user: state.user,
    });

    dispatch({ type: 'ADD_CATEGORY', payload: category });
    return category;
  }

  async function loadManagedProductCategories() {
    const categories = await listManagedCategories({
      accessToken: state.authToken,
      user: state.user,
    });

    dispatch({ type: 'SET_CATEGORIES', payload: categories });
    return categories;
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
        role: payload.role || brand.roles.customer,
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

  async function verifyResetCode(email, code) {
    return verifyPasswordResetCode(email, code);
  }

  async function resetForgottenPassword(resetToken, newPassword) {
    return resetPasswordWithToken(resetToken, newPassword);
  }

  async function loadAudits() {
    if (!isApiMode()) {
      dispatch({ type: 'SET_AUDITS', payload: [] });
      return [];
    }

    if (!isAdminRole(state.user?.role)) {
      throw new Error('Solo el administrador puede consultar auditorias.');
    }

    const audits = await listAudits({
      accessToken: state.authToken,
      user: state.user,
    });

    dispatch({ type: 'SET_AUDITS', payload: audits });
    return audits;
  }

  async function loadSellerSales() {
    if (!isApiMode()) {
      dispatch({ type: 'SET_SELLER_SALES', payload: [] });
      return [];
    }

    if (
      state.user?.role !== brand.roles.seller &&
      !isAdminRole(state.user?.role)
    ) {
      throw new Error('Solo administradores y vendedores pueden consultar ventas.');
    }

    const sales = await listSellerSales({
      accessToken: state.authToken,
      user: state.user,
    });

    dispatch({ type: 'SET_SELLER_SALES', payload: sales });
    return sales;
  }

  async function loadOrders() {
    if (!state.user) {
      throw new Error('Debes iniciar sesion para consultar pedidos.');
    }

    if (!isApiMode()) {
      return state.orders;
    }

    const orders = await listCurrentOrders(buildActiveSession(state));
    const lastOrder = orders[0] || null;

    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        authToken: state.authToken,
        user: state.user,
        company: state.company,
        products: state.products,
        categories: state.categories,
        users: state.users,
        orders,
        lastOrder,
        audits: state.audits,
        sellerSales: state.sellerSales,
        sellerOrders: state.sellerOrders,
      },
    });

    return orders;
  }

  async function loadAssignedSellerOrders() {
    if (!state.user) {
      throw new Error('Debes iniciar sesion para consultar pedidos asignados.');
    }

    if (
      state.user.role !== brand.roles.seller &&
      !isAdminRole(state.user.role)
    ) {
      throw new Error('Solo vendedores y administradores pueden consultar pedidos COD.');
    }

    if (!isApiMode()) {
      dispatch({ type: 'SET_SELLER_ORDERS', payload: [] });
      return [];
    }

    const sellerOrders = await listAssignedCashOnDeliveryOrders(buildActiveSession(state));
    dispatch({ type: 'SET_SELLER_ORDERS', payload: sellerOrders });
    return sellerOrders;
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
          state.categories,
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
          user:
            order.customerPhoneNumber && state.user
              ? {
                  ...state.user,
                  phoneNumber: order.customerPhoneNumber,
                }
              : state.user,
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

  async function refreshOrderPaymentStatus(orderId) {
    if (!state.user) {
      throw new Error('Debes iniciar sesion para consultar el pago.');
    }

    const order = await refreshOrderPaymentStatusRequest(orderId, {
      accessToken: state.authToken,
      user: state.user,
    });
    let products = state.products;

    if (isApiMode()) {
      const catalog = await bootstrapCatalogWithSession(
        state.products,
        state.users,
        state.categories,
        {
          accessToken: state.authToken,
          user: state.user,
        },
      );
      products = catalog.products;
    }

    dispatch({
      type: 'UPSERT_ORDER',
      payload: {
        order,
        products,
        user:
          order.customerPhoneNumber && state.user
            ? {
                ...state.user,
                phoneNumber: order.customerPhoneNumber,
              }
            : state.user,
      },
    });

    return order;
  }

  async function acceptCashOnDeliveryOrder(orderId) {
    const order = await acceptCashOnDeliveryOrderRequest(
      orderId,
      buildActiveSession(state),
    );
    dispatch({ type: 'UPSERT_ORDER', payload: { order } });
    return order;
  }

  async function rejectCashOnDeliveryOrder(orderId) {
    const order = await rejectCashOnDeliveryOrderRequest(
      orderId,
      buildActiveSession(state),
    );
    let products = state.products;

    if (isApiMode()) {
      const catalog = await bootstrapCatalogWithSession(
        state.products,
        state.users,
        state.categories,
        buildActiveSession(state),
      );
      products = catalog.products;
    }

    dispatch({ type: 'UPSERT_ORDER', payload: { order, products } });
    return order;
  }

  async function markCashOnDeliveryInPreparation(orderId) {
    const order = await markCashOnDeliveryInPreparationRequest(
      orderId,
      buildActiveSession(state),
    );
    dispatch({ type: 'UPSERT_ORDER', payload: { order } });
    return order;
  }

  async function markCashOnDeliveryInTransit(orderId) {
    const order = await markCashOnDeliveryInTransitRequest(
      orderId,
      buildActiveSession(state),
    );
    dispatch({ type: 'UPSERT_ORDER', payload: { order } });
    return order;
  }

  async function confirmCashOnDeliveryWithOtp(orderId, otp) {
    const order = await confirmCashOnDeliveryWithOtpRequest(
      orderId,
      otp,
      buildActiveSession(state),
    );
    dispatch({ type: 'UPSERT_ORDER', payload: { order } });
    return order;
  }

  async function confirmCashOnDeliveryPayment(orderId, note = '') {
    const order = await confirmCashOnDeliveryPaymentRequest(
      orderId,
      note,
      buildActiveSession(state),
    );
    dispatch({ type: 'UPSERT_ORDER', payload: { order } });
    return order;
  }

  async function submitCustomerRating(orderId, stars) {
    const order = await rateCustomerForOrderRequest(
      orderId,
      stars,
      buildActiveSession(state),
    );

    dispatch({
      type: 'UPSERT_ORDER',
      payload: {
        order,
      },
    });

    return order;
  }

  async function submitOrderRatings(orderId, ratings) {
    if (!state.user) {
      throw new Error('Debes iniciar sesion para calificar productos.');
    }

    const responseOrder = await rateOrderProducts(orderId, ratings, {
      accessToken: state.authToken,
      user: state.user,
    });
    const fallbackOrder =
      state.orders.find((currentOrder) => currentOrder.id === orderId) ||
      (state.lastOrder?.id === orderId ? state.lastOrder : null);
    const order = isApiMode()
      ? responseOrder
      : {
          ...(fallbackOrder || {}),
          ...responseOrder,
          items: (fallbackOrder?.items || []).map((item) => {
            const ratedItem = responseOrder.items?.find(
              (currentItem) => Number(currentItem.id) === Number(item.id),
            );

            if (!ratedItem) {
              return item;
            }

            return {
              ...item,
              customerRating: ratedItem.customerRating,
              ratedAt: ratedItem.ratedAt,
            };
          }),
          ratingEligible: false,
          hasPendingRatings: false,
        };

    let products = state.products;
    let users = state.users;

    if (isApiMode()) {
      const catalog = await bootstrapCatalogWithSession(
        state.products,
        state.users,
        state.categories,
        {
          accessToken: state.authToken,
          user: state.user,
        },
      );
      products = catalog.products;
      users = isAdminRole(state.user.role) ? catalog.users : state.users;
    }

    dispatch({
      type: 'UPSERT_ORDER',
      payload: {
        order,
        products,
        users,
      },
    });

    return order;
  }

  function clearAppError() {
    dispatch({ type: 'CLEAR_APP_ERROR' });
  }

  return (
    <AppStoreContext.Provider
      value={{
        state,
        user: state.user,
        company: state.company,
        products: state.products,
        categories: state.categories,
        users: state.users,
        audits: state.audits,
        sellerSales: state.sellerSales,
        sellerOrders: state.sellerOrders,
        cartItems: state.cartItems,
        orders: state.orders,
        lastOrder: state.lastOrder,
        cartSummary,
        featuredProducts,
        latestProducts,
        productCategories,
        isAuthenticated: Boolean(state.user),
        isAdmin: isAdminRole(state.user?.role),
        isSuperAdmin: state.user?.role === brand.roles.superadmin,
        isSeller: state.user?.role === brand.roles.seller,
        isCustomer: state.user?.role === brand.roles.customer,
        signIn,
        signOut,
        saveCompany,
        addProduct,
        updateProduct,
        addCategory,
        loadManagedProductCategories,
        addUser,
        registerUser,
        sendPasswordReset,
        verifyResetCode,
        resetForgottenPassword,
        loadAudits,
        loadSellerSales,
        loadOrders,
        loadAssignedSellerOrders,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        checkout,
        refreshOrderPaymentStatus,
        acceptCashOnDeliveryOrder,
        rejectCashOnDeliveryOrder,
        markCashOnDeliveryInPreparation,
        markCashOnDeliveryInTransit,
        confirmCashOnDeliveryWithOtp,
        confirmCashOnDeliveryPayment,
        submitOrderRatings,
        submitCustomerRating,
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
