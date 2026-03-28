export function getCartSummary(cartItems) {
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  return {
    itemCount,
    subtotal,
    tax,
    total,
  };
}

export function findProductById(products, productId) {
  return products.find((product) => product.id === productId);
}
