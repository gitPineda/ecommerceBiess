export const initialState = {
  isBootstrapping: true,
  isAuthenticating: false,
  isCheckoutLoading: false,
  authToken: '',
  user: null,
  products: [],
  users: [],
  cartItems: [],
  orders: [],
  lastOrder: null,
  appError: '',
};

function clampQuantity(quantity, maxStock) {
  return Math.max(1, Math.min(quantity, maxStock));
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
        products: action.payload.products,
        users: action.payload.users,
        cartItems: action.payload.cartItems,
        appError: '',
      };
    case 'BOOTSTRAP_FAILURE':
      return {
        ...state,
        isBootstrapping: false,
        authToken: action.payload.authToken || '',
        user: action.payload.user,
        products: action.payload.products,
        users: action.payload.users,
        cartItems: action.payload.cartItems,
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
        products: action.payload.products ?? state.products,
        users: action.payload.users ?? state.users,
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
        cartItems: [],
        appError: '',
      };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [action.payload, ...state.products],
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
        cartItems: [],
        products: action.payload.products ?? state.products,
        lastOrder: action.payload.order,
        orders: [action.payload.order, ...state.orders],
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
