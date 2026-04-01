import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createPrismaClientOptions } from '../src/modules/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

async function upsertUser(params: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: Role;
}) {
  const passwordHash = await hash(params.password, 10);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      firstName: params.firstName,
      lastName: params.lastName,
      username: params.username,
      passwordHash,
      role: params.role,
    },
    create: {
      firstName: params.firstName,
      lastName: params.lastName,
      username: params.username,
      email: params.email,
      passwordHash,
      role: params.role,
    },
  });
}

async function seedProducts() {
  const existingProducts = await prisma.product.count();

  if (existingProducts > 0) {
    return;
  }

  await prisma.product.createMany({
    data: [
      {
        name: 'Arroz Premium 5kg',
        sku: 'ARR-005',
        categoryId: 'despensa',
        category: 'Despensa',
        price: 7.5,
        stock: 25,
        featured: true,
        isPromotion: true,
        promotionDiscount: 10,
        description: 'Arroz premium de grano largo para consumo familiar.',
      },
      {
        name: 'Aceite Vegetal 1L',
        sku: 'ACE-001',
        categoryId: 'despensa',
        category: 'Despensa',
        price: 3.25,
        stock: 40,
        featured: true,
        isPromotion: false,
        promotionDiscount: 0,
        description: 'Aceite vegetal refinado para cocina diaria.',
      },
      {
        name: 'Jabon Liquido 900ml',
        sku: 'HOG-900',
        categoryId: 'hogar',
        category: 'Hogar',
        price: 4.8,
        stock: 18,
        featured: false,
        isPromotion: true,
        promotionDiscount: 15,
        description: 'Jabon liquido multiusos para limpieza del hogar.',
      },
    ],
  });
}

async function main() {
  await upsertUser({
    firstName: 'Admin',
    lastName: 'Principal',
    username: 'admin',
    email: 'admin@biess.local',
    password: 'Admin123*',
    role: Role.ADMIN,
  });

  await upsertUser({
    firstName: 'Cliente',
    lastName: 'Demo',
    username: 'cliente',
    email: 'cliente@biess.local',
    password: 'Cliente123*',
    role: Role.CUSTOMER,
  });

  await seedProducts();

  console.log('Seed completado.');
}

main()
  .catch((error) => {
    console.error('Seed fallo:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
