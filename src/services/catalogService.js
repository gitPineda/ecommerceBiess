import productsData from '../data/products.json';
import usersData from '../data/users.json';
import { normalizeProduct } from './productUtils';

const NETWORK_DELAY_MS = 450;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function bootstrapCatalog(storedProducts, storedUsers) {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

  return {
    products: (storedProducts?.length ? clone(storedProducts) : clone(productsData)).map(
      normalizeProduct,
    ),
    users: storedUsers?.length ? clone(storedUsers) : clone(usersData),
  };
}
