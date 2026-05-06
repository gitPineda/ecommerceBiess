import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_COMPANY_SINGLETON_KEY,
} from '../src/config/default-company';
import { createPrismaClientOptions } from '../src/modules/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

const BASE_USERS = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    username: 'superadmin',
    email: 'superadmin@biess.local',
    password: 'SuperAdmin123*',
    role: 'superadmin',
  },
  {
    firstName: 'Admin',
    lastName: 'Principal',
    username: 'admin',
    email: 'admin@biess.local',
    password: 'Admin123*',
    role: 'admin',
  },
  {
    firstName: 'Cliente',
    lastName: 'Demo',
    username: 'cliente',
    email: 'cliente@biess.local',
    password: 'Cliente123*',
    role: 'customer',
  },
  {
    firstName: 'Maria',
    lastName: 'Lopez',
    username: 'maria.vendedora',
    email: 'maria.vendedora@biess.local',
    password: 'Maria123*',
    role: 'seller',
  },
  {
    firstName: 'Carlos',
    lastName: 'Perez',
    username: 'carlos.vendedor',
    email: 'carlos.vendedor@biess.local',
    password: 'Carlos123*',
    role: 'seller',
  },
  {
    firstName: 'Lucia',
    lastName: 'Mendoza',
    username: 'lucia.vendedora',
    email: 'lucia.vendedora@biess.local',
    password: 'Lucia123*',
    role: 'seller',
  },
] as const;

const BASE_ROLES = [
  {
    code: 'customer',
    name: 'Cliente',
    description: 'Compra productos y consulta sus pedidos.',
    sortOrder: 1,
  },
  {
    code: 'seller',
    name: 'Vendedor',
    description: 'Gestiona sus productos y revisa sus ventas.',
    sortOrder: 2,
  },
  {
    code: 'admin',
    name: 'Administrador',
    description: 'Gestiona catalogo, usuarios, categorias y empresa.',
    sortOrder: 3,
  },
  {
    code: 'superadmin',
    name: 'Superadministrador',
    description: 'Tiene acceso total sobre la administracion.',
    sortOrder: 4,
  },
] as const;

const BASE_CATEGORIES = [
  {
    id: 'despensa',
    name: 'Despensa',
    icon: 'basket-outline',
    description: 'Productos de abarrotes y consumo diario.',
    sortOrder: 1,
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    icon: 'wine-outline',
    description: 'Bebidas frias, calientes y complementos.',
    sortOrder: 2,
  },
  {
    id: 'snacks',
    name: 'Snacks',
    icon: 'fast-food-outline',
    description: 'Snacks, galletas y productos para consumo rapido.',
    sortOrder: 3,
  },
  {
    id: 'hogar',
    name: 'Hogar',
    icon: 'home-outline',
    description: 'Limpieza, cuidado y articulos para el hogar.',
    sortOrder: 4,
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: 'headset-outline',
    description: 'Parlantes, audifonos y accesorios de sonido.',
    sortOrder: 5,
  },
  {
    id: 'accesorios',
    name: 'Accesorios',
    icon: 'briefcase-outline',
    description: 'Accesorios y complementos de uso general.',
    sortOrder: 6,
  },
] as const;

async function upsertUser(params: (typeof BASE_USERS)[number]) {
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

async function upsertRole(params: (typeof BASE_ROLES)[number]) {
  return prisma.userRole.upsert({
    where: { code: params.code },
    update: {
      name: params.name,
      description: params.description,
      isActive: true,
      sortOrder: params.sortOrder,
    },
    create: {
      code: params.code,
      name: params.name,
      description: params.description,
      isActive: true,
      sortOrder: params.sortOrder,
    },
  });
}

async function upsertCategory(params: (typeof BASE_CATEGORIES)[number]) {
  return prisma.productCategory.upsert({
    where: {
      id: params.id,
    },
    update: {
      name: params.name,
      icon: params.icon,
      description: params.description,
      sortOrder: params.sortOrder,
      isActive: true,
    },
    create: {
      id: params.id,
      name: params.name,
      icon: params.icon,
      description: params.description,
      sortOrder: params.sortOrder,
      isActive: true,
    },
  });
}

async function main() {
  await prisma.empresa.upsert({
    where: {
      singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
    },
    update: {
      ...DEFAULT_COMPANY_CONFIG,
    },
    create: {
      singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
      ...DEFAULT_COMPANY_CONFIG,
    },
  });

  await Promise.all(BASE_ROLES.map((role) => upsertRole(role)));
  await Promise.all(BASE_CATEGORIES.map((category) => upsertCategory(category)));
  await Promise.all(BASE_USERS.map((user) => upsertUser(user)));

  console.log('Seed base completado.');
}

main()
  .catch((error) => {
    console.error('Seed fallo:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
