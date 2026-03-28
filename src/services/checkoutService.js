const CHECKOUT_DELAY_MS = 500;

export async function processCheckout(payload) {
  await new Promise((resolve) => setTimeout(resolve, CHECKOUT_DELAY_MS));

  return {
    id: `ord-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    paymentMethod: payload.paymentMethod,
    total: payload.total,
    shippingAddress: payload.shippingAddress,
    items: payload.items,
  };
}
