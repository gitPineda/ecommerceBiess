import { getDefaultCompanyConfig } from '../config/company';

export const initialState = {
  isBootstrapping: true,
  isAuthenticating: false,
  isCheckoutLoading: false,
  authToken: '',
  user: null,
  company: getDefaultCompanyConfig(),
  products: [],
  categories: [],
  users: [],
  audits: [],
  sellerSales: [],
  sellerOrders: [],
  cartItems: [],
  orders: [],
  lastOrder: null,
  appError: '',
};

function clampQuantity(quantity, maxStock) {
  return Math.max(1, Math.min(quantity, maxStock));
}

function shouldRetainCart(order) {
  return (
    order?.paymentStatus === 'failed' ||
    order?.paymentStatus === 'canceled' ||
    order?.status === 'payment_failed' ||
    order?.status === 'payment_canceled'
  );
}

function mergeOrder(orders, order) {
  const filteredOrders = orders.filter((item) => item.id !== order.id);
  return [order, ...filteredOrders];
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'BOOTSTRAP_START':
      return {
        ...state,
        isBootstrapping: true,
        appError: '',
      };
    case 'BOOTSTRAP_SUCCESS':
      return {
        ...state,
        isBootstrapping: false,
        authToken: action.payload.authToken || '',
        user: action.payload.user,
        company: action.payload.company ?? state.company,
        products: action.payload.products,
        categories: action.payload.categories ?? [],
        users: action.payload.users,
        audits: action.payload.audits ?? [],
        sellerSales: action.payload.sellerSales ?? [],
        sellerOrders: action.payload.sellerOrders ?? [],
        cartItems: action.payload.cartItems,
        orders: action.payload.orders ?? [],
        lastOrder: action.payload.lastOrder ?? null,
        appError: '',
      };
    case 'BOOTSTRAP_FAILURE':
      return {
        ...state,
        isBootstrapping: false,
        authToken: action.payload.authToken || '',
        user: action.payload.user,
        company: action.payload.company ?? state.company,
        products: action.payload.products,
        categories: action.payload.categories ?? [],
        users: action.payload.users,
        audits: action.payload.audits ?? [],
        sellerSales: action.payload.sellerSales ?? [],
        sellerOrders: action.payload.sellerOrders ?? [],
        cartItems: action.payload.cartItems,
        orders: action.payload.orders ?? [],
        lastOrder: action.payload.lastOrder ?? null,
        appError: action.payload.message,
      };
    case 'AUTH_START':
      return {
        ...state,
        isAuthenticating: true,
        appError: '',
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticating: false,
        authToken: action.payload.authToken || '',
        user: action.payload.user,
        company: action.payload.company ?? state.company,
        products: action.payload.products ?? state.products,
        categories: action.payload.categories ?? state.categories,
        users: action.payload.users ?? state.users,
        orders: action.payload.orders ?? state.orders,
        lastOrder: action.payload.lastOrder ?? state.lastOrder,
        audits: action.payload.audits ?? state.audits,
        sellerSales: action.payload.sellerSales ?? state.sellerSales,
        sellerOrders: action.payload.sellerOrders ?? state.sellerOrders,
        appError: '',
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticating: false,
        appError: action.payload,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        authToken: '',
        user: null,
        audits: [],
        sellerSales: [],
        sellerOrders: [],
        cartItems: [],
        orders: [],
        lastOrder: null,
        appError: '',
      };
    case 'SET_COMPANY':
      return {
        ...state,
        company: action.payload,
      };
    case 'SET_AUDITS':
      return {
        ...state,
        audits: action.payload,
      };
    case 'SET_SELLER_SALES':
      return {
        ...state,
        sellerSales: action.payload,
      };
    case 'SET_SELLER_ORDERS':
      return {
        ...state,
        sellerOrders: action.payload,
      };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [action.payload, ...state.products],
      };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id ? action.payload : product,
        ),
      };
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
      };
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.payload].sort(
          (left, right) =>
            Number(left.sortOrder || 0) - Number(right.sortOrder || 0) ||
            left.label.localeCompare(right.label),
        ),
      };
    case 'ADD_USER':
      return {
        ...state,
        users: [action.payload, ...state.users],
      };
    case 'ADD_TO_CART': {
      const existingItem = state.cartItems.find(
        (item) => item.productId === action.payload.product.id,
      );

      if (existingItem) {
        return {
          ...state,
          cartItems: state.cartItems.map((item) =>
            item.productId === action.payload.product.id
              ? {
                  ...item,
                  quantity: clampQuantity(
                    item.quantity + action.payload.quantity,
                    action.payload.product.stock,
                  ),
                }
              : item,
          ),
        };
      }

      return {
        ...state,
        cartItems: [
          ...state.cartItems,
          {
            productId: action.payload.product.id,
            name: action.payload.product.name,
            category: action.payload.product.category,
            price: action.payload.unitPrice,
            quantity: clampQuantity(action.payload.quantity, action.payload.product.stock),
          },
        ],
      };
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cartItems: state.cartItems.filter((item) => item.productId !== action.payload),
      };
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cartItems: state.cartItems
          .map((item) =>
            item.productId === action.payload.productId
              ? {
                  ...item,
                  quantity: clampQuantity(action.payload.quantity, action.payload.maxStock),
                }
              : item,
          )
          .filter((item) => item.quantity > 0),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cartItems: [],
      };
    case 'CHECKOUT_START':
      return {
        ...state,
        isCheckoutLoading: true,
        appError: '',
      };
    case 'CHECKOUT_SUCCESS':
      return {
        ...state,
        isCheckoutLoading: false,
        cartItems: shouldRetainCart(action.payload.order) ? state.cartItems : [],
        user: action.payload.user ?? state.user,
        products: action.payload.products ?? state.products,
        lastOrder: action.payload.order,
        orders: mergeOrder(state.orders, action.payload.order),
        sellerOrders: mergeOrder(state.sellerOrders, action.payload.order),
        appError: '',
      };
    case 'UPSERT_ORDER':
      return {
        ...state,
        user: action.payload.user ?? state.user,
        products: action.payload.products ?? state.products,
        users: action.payload.users ?? state.users,
        lastOrder: action.payload.order,
        orders: mergeOrder(state.orders, action.payload.order),
        sellerOrders: mergeOrder(state.sellerOrders, action.payload.order),
        appError: '',
      };
    case 'CHECKOUT_FAILURE':
      return {
        ...state,
        isCheckoutLoading: false,
        appError: action.payload,
      };
    case 'CLEAR_APP_ERROR':
      return {
        ...state,
        appError: '',
      };
    default:
      return state;
  }
}
