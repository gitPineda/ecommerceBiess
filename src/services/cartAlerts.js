import { Alert } from 'react-native';
import { getCartItemQuantity } from '../store/selectors';

export function showStockInsufficientAlert(message) {
  Alert.alert('Stock insuficiente', message);
}

export function confirmAddProductToCart({
  product,
  cartItems,
  addToCart,
  quantity = 1,
}) {
  const currentQuantity = getCartItemQuantity(cartItems, product.id);
  const availableUnits = Math.max(Number(product.stock || 0) - currentQuantity, 0);

  if (availableUnits < quantity) {
    const message =
      availableUnits > 0
        ? currentQuantity > 0
          ? `No hay stock suficiente de ${product.name}. Solo puedes agregar ${availableUnits} unidad(es) adicional(es).`
          : `No hay stock suficiente de ${product.name}. Solo quedan ${availableUnits} unidad(es) disponibles.`
        : `No hay stock suficiente de ${product.name}.`;

    showStockInsufficientAlert(message);
    return;
  }

  Alert.alert(
    'Confirmar producto',
    `Estas seguro de agregar ${product.name} al carrito?`,
    [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Si',
        onPress: () => {
          try {
            addToCart(product.id, quantity);
          } catch (error) {
            showStockInsufficientAlert(
              error.message || 'No hay stock suficiente para este producto.',
            );
          }
        },
      },
    ],
  );
}
