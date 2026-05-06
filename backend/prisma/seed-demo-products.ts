import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';
import { createPrismaClientOptions } from '../src/modules/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

const DEMO_PRODUCTS = [
  {
    sellerUsername: 'maria.vendedora',
    categoryId: 'despensa',
    name: 'Arroz Premium 5kg',
    sku: 'DEMO-ARR-005',
    price: 7.5,
    stock: 40,
    featured: true,
    isPromotion: true,
    promotionDiscount: 10,
    description: 'Arroz premium de grano largo para pruebas visuales del catalogo.',
    imageFile: 'despensa-arroz.png',
  },
  {
    sellerUsername: 'lucia.vendedora',
    categoryId: 'bebidas',
    name: 'Cafe Molido 500g',
    sku: 'DEMO-CAF-500',
    price: 6.9,
    stock: 24,
    featured: true,
    isPromotion: true,
    promotionDiscount: 12,
    description: 'Cafe molido demo para validar imagenes en cards, detalle y ventas.',
    imageFile: 'bebidas-cafe.png',
  },
  {
    sellerUsername: 'carlos.vendedor',
    categoryId: 'hogar',
    name: 'Jabon Liquido 900ml',
    sku: 'DEMO-HOG-900',
    price: 4.8,
    stock: 26,
    featured: true,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Jabon liquido demo para flujo visual de productos con Cloudinary.',
    imageFile: 'hogar-jabon.png',
  },
  {
    sellerUsername: 'maria.vendedora',
    categoryId: 'despensa',
    name: 'Avena Instantanea 500g',
    sku: 'DEMO-AVE-500',
    price: 4.3,
    stock: 32,
    featured: false,
    isPromotion: true,
    promotionDiscount: 8,
    description: 'Avena instantanea para desayunos y recetas rapidas del dia a dia.',
    imageFile: 'despensa-arroz.png',
  },
  {
    sellerUsername: 'maria.vendedora',
    categoryId: 'despensa',
    name: 'Spaghetti Premium 500g',
    sku: 'DEMO-SPA-500',
    price: 3.95,
    stock: 38,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Pasta tipo spaghetti para preparaciones familiares y menu diario.',
    imageFile: 'despensa-arroz.png',
  },
  {
    sellerUsername: 'maria.vendedora',
    categoryId: 'despensa',
    name: 'Quinoa Blanca 400g',
    sku: 'DEMO-QUI-400',
    price: 5.15,
    stock: 30,
    featured: false,
    isPromotion: true,
    promotionDiscount: 6,
    description: 'Quinoa blanca para complementar un surtido saludable dentro del catalogo.',
    imageFile: 'despensa-arroz.png',
  },
  {
    sellerUsername: 'maria.vendedora',
    categoryId: 'despensa',
    name: 'Lenteja Selecta 450g',
    sku: 'DEMO-LEN-450',
    price: 3.25,
    stock: 34,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Lenteja seleccionada para compras recurrentes y reposicion de despensa.',
    imageFile: 'despensa-arroz.png',
  },
  {
    sellerUsername: 'maria.vendedora',
    categoryId: 'despensa',
    name: 'Harina Multiuso 1kg',
    sku: 'DEMO-HAR-1KG',
    price: 2.6,
    stock: 27,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Harina multiuso para cocina diaria, panaderia casera y reposteria basica.',
    imageFile: 'despensa-arroz.png',
  },
  {
    sellerUsername: 'carlos.vendedor',
    categoryId: 'bebidas',
    name: 'Cafe Intenso 250g',
    sku: 'DEMO-CAF-250',
    price: 4.95,
    stock: 22,
    featured: true,
    isPromotion: true,
    promotionDiscount: 10,
    description: 'Cafe tostado de perfil intenso para consumidores frecuentes de bebidas calientes.',
    imageFile: 'bebidas-cafe.png',
  },
  {
    sellerUsername: 'carlos.vendedor',
    categoryId: 'bebidas',
    name: 'Cafe Descafeinado 250g',
    sku: 'DEMO-CAF-DEC',
    price: 5.1,
    stock: 28,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Cafe descafeinado para clientes que priorizan sabor suave y consumo nocturno.',
    imageFile: 'bebidas-cafe.png',
  },
  {
    sellerUsername: 'carlos.vendedor',
    categoryId: 'bebidas',
    name: 'Capuchino Instantaneo 200g',
    sku: 'DEMO-CAP-200',
    price: 6.25,
    stock: 24,
    featured: false,
    isPromotion: true,
    promotionDiscount: 9,
    description: 'Capuchino instantaneo para venta por impulso y ticket medio en bebidas.',
    imageFile: 'bebidas-cafe.png',
  },
  {
    sellerUsername: 'carlos.vendedor',
    categoryId: 'bebidas',
    name: 'Te Negro Premium 20u',
    sku: 'DEMO-TEA-020',
    price: 2.9,
    stock: 33,
    featured: false,
    isPromotion: true,
    promotionDiscount: 7,
    description: 'Caja de te premium para completar el surtido de bebidas calientes.',
    imageFile: 'bebidas-cafe.png',
  },
  {
    sellerUsername: 'carlos.vendedor',
    categoryId: 'bebidas',
    name: 'Chocolate en Polvo 300g',
    sku: 'DEMO-CHO-300',
    price: 4.4,
    stock: 20,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Chocolate en polvo para bebidas calientes y preparaciones familiares.',
    imageFile: 'bebidas-cafe.png',
  },
  {
    sellerUsername: 'lucia.vendedora',
    categoryId: 'hogar',
    name: 'Detergente Liquido 2L',
    sku: 'DEMO-DET-2LT',
    price: 6.45,
    stock: 25,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Detergente liquido para lavado de ropa y limpieza rutinaria del hogar.',
    imageFile: 'hogar-jabon.png',
  },
  {
    sellerUsername: 'lucia.vendedora',
    categoryId: 'hogar',
    name: 'Jabon para Platos 750ml',
    sku: 'DEMO-JPL-750',
    price: 3.35,
    stock: 29,
    featured: false,
    isPromotion: true,
    promotionDiscount: 9,
    description: 'Jabon para platos con formato familiar y alta rotacion en catalogo.',
    imageFile: 'hogar-jabon.png',
  },
  {
    sellerUsername: 'lucia.vendedora',
    categoryId: 'hogar',
    name: 'Esponja Multiuso 3u',
    sku: 'DEMO-ESP-003',
    price: 2.15,
    stock: 47,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Set de esponjas multiuso para cocina y limpieza liviana del hogar.',
    imageFile: 'hogar-jabon.png',
  },
  {
    sellerUsername: 'lucia.vendedora',
    categoryId: 'hogar',
    name: 'Desinfectante Multiusos 900ml',
    sku: 'DEMO-DES-900',
    price: 4.1,
    stock: 31,
    featured: false,
    isPromotion: true,
    promotionDiscount: 5,
    description: 'Desinfectante multiusos para superficies y limpieza general del hogar.',
    imageFile: 'hogar-jabon.png',
  },
  {
    sellerUsername: 'lucia.vendedora',
    categoryId: 'hogar',
    name: 'Limpiador Antigrasa 650ml',
    sku: 'DEMO-ANT-650',
    price: 3.95,
    stock: 23,
    featured: false,
    isPromotion: false,
    promotionDiscount: 0,
    description: 'Limpiador antigrasa para cocina y superficies con suciedad recurrente.',
    imageFile: 'hogar-jabon.png',
  },
] as const;

type CloudinaryUploadResponse = {
  asset_id?: string;
  public_id?: string;
  version?: number | string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  secure_url?: string;
  url?: string;
  bytes?: number;
  created_at?: string;
  original_filename?: string;
  error?: {
    message?: string;
  };
};

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Falta la variable ${key} en backend/.env`);
  }

  return value;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^-+|-+$/g, '')
    .replace(/\/-+|-+\//g, '/')
    .slice(0, 120) || 'product';
}

function signRequest(
  params: Record<string, string | number | boolean | null | undefined>,
  apiSecret: string,
) {
  const stringifiedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1')
    .update(`${stringifiedParams}${apiSecret}`)
    .digest('hex');
}

function buildTransformedUrl(secureUrl: string, transformation: string) {
  return secureUrl.replace('/upload/', `/upload/${transformation}/`);
}

function sendFormRequest(requestUrl: string, body: URLSearchParams) {
  return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const requestBody = body.toString();
    const url = new URL(requestUrl);
    const request = httpsRequest(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });
}

async function uploadDemoImage(params: {
  sku: string;
  sellerUsername: string;
  imageFile?: string;
  sourceUrl?: string;
}) {
  const cloudName = getRequiredEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = getRequiredEnv('CLOUDINARY_API_KEY');
  const apiSecret = getRequiredEnv('CLOUDINARY_API_SECRET');
  const baseFolder = process.env.CLOUDINARY_PRODUCTS_FOLDER?.trim() || 'products';
  const folder = `${baseFolder}/demo/${slugify(params.sellerUsername)}`;
  const publicId = slugify(params.sku);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signRequest(
    {
      folder,
      overwrite: 'true',
      public_id: publicId,
      timestamp,
    },
    apiSecret,
  );
  let fileValue = '';
  let originalName = '';
  let mimeType = 'image/jpeg';

  if (params.imageFile) {
    const filePath = join(process.cwd(), 'prisma', 'seed-assets', params.imageFile);
    const fileBase64 = readFileSync(filePath).toString('base64');
    fileValue = `data:image/png;base64,${fileBase64}`;
    originalName = params.imageFile;
    mimeType = 'image/png';
  } else if (params.sourceUrl) {
    fileValue = params.sourceUrl;
    originalName = decodeURIComponent(
      new URL(params.sourceUrl).pathname.split('/').pop() || `${publicId}.jpg`,
    );
    mimeType = originalName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  } else {
    throw new Error(`No se definio origen de imagen para ${params.sku}.`);
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    file: fileValue,
    folder,
    overwrite: 'true',
    public_id: publicId,
    signature,
    timestamp,
  });
  const response = await sendFormRequest(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    body,
  );
  const payload = JSON.parse(response.body) as CloudinaryUploadResponse;

  if (response.statusCode < 200 || response.statusCode >= 300 || payload.error) {
    throw new Error(
      payload.error?.message ||
        `Cloudinary rechazo la imagen demo ${params.imageFile}.`,
    );
  }

  if (!payload.secure_url || !payload.public_id) {
    throw new Error(
      `Cloudinary no devolvio informacion suficiente para ${params.imageFile}.`,
    );
  }

  return {
    provider: 'cloudinary',
    publicId: payload.public_id,
    assetId: payload.asset_id || null,
    url: payload.url || payload.secure_url,
    secureUrl: payload.secure_url,
    thumbUrl: buildTransformedUrl(
      payload.secure_url,
      'c_fill,g_auto,h_96,w_96/f_auto,q_auto',
    ),
    cardUrl: buildTransformedUrl(
      payload.secure_url,
      'c_fill,g_auto,h_320,w_320/f_auto,q_auto',
    ),
    detailUrl: buildTransformedUrl(
      payload.secure_url,
      'c_fill,g_auto,h_720,w_720/f_auto,q_auto',
    ),
    width: payload.width || null,
    height: payload.height || null,
    bytes: payload.bytes || null,
    format: payload.format || null,
    resourceType: payload.resource_type || 'image',
    mimeType,
    folder,
    version: payload.version ? String(payload.version) : null,
    originalName,
    uploadedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
  };
}

async function main() {
  for (const productSeed of DEMO_PRODUCTS) {
    const seller = await prisma.user.findUnique({
      where: {
        username: productSeed.sellerUsername,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!seller) {
      throw new Error(
        `No existe el vendedor ${productSeed.sellerUsername}. Ejecuta antes el seed base.`,
      );
    }

    const category = await prisma.productCategory.findUnique({
      where: {
        id: productSeed.categoryId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw new Error(
        `No existe la categoria ${productSeed.categoryId}. Ejecuta antes el seed base.`,
      );
    }

    const uploadedImage = await uploadDemoImage({
      sku: productSeed.sku,
      sellerUsername: seller.username,
      imageFile: productSeed.imageFile,
      sourceUrl: productSeed.sourceUrl,
    });

    await prisma.product.upsert({
      where: {
        sku: productSeed.sku,
      },
      update: {
        name: productSeed.name,
        sellerId: seller.id,
        categoryId: category.id,
        category: category.name,
        price: productSeed.price,
        stock: productSeed.stock,
        isActive: true,
        archivedAt: null,
        deletedAt: null,
        featured: productSeed.featured,
        isPromotion: productSeed.isPromotion,
        promotionDiscount: productSeed.promotionDiscount,
        description: productSeed.description,
        imageProvider: uploadedImage.provider,
        imagePublicId: uploadedImage.publicId,
        imageAssetId: uploadedImage.assetId,
        imageUrl: uploadedImage.url,
        imageSecureUrl: uploadedImage.secureUrl,
        imageThumbUrl: uploadedImage.thumbUrl,
        imageCardUrl: uploadedImage.cardUrl,
        imageDetailUrl: uploadedImage.detailUrl,
        imageWidth: uploadedImage.width,
        imageHeight: uploadedImage.height,
        imageBytes: uploadedImage.bytes,
        imageFormat: uploadedImage.format,
        imageResourceType: uploadedImage.resourceType,
        imageMimeType: uploadedImage.mimeType,
        imageFolder: uploadedImage.folder,
        imageVersion: uploadedImage.version,
        imageOriginalName: uploadedImage.originalName,
        imageUploadedAt: uploadedImage.uploadedAt,
      },
      create: {
        name: productSeed.name,
        sku: productSeed.sku,
        sellerId: seller.id,
        categoryId: category.id,
        category: category.name,
        price: productSeed.price,
        stock: productSeed.stock,
        isActive: true,
        featured: productSeed.featured,
        isPromotion: productSeed.isPromotion,
        promotionDiscount: productSeed.promotionDiscount,
        description: productSeed.description,
        imageProvider: uploadedImage.provider,
        imagePublicId: uploadedImage.publicId,
        imageAssetId: uploadedImage.assetId,
        imageUrl: uploadedImage.url,
        imageSecureUrl: uploadedImage.secureUrl,
        imageThumbUrl: uploadedImage.thumbUrl,
        imageCardUrl: uploadedImage.cardUrl,
        imageDetailUrl: uploadedImage.detailUrl,
        imageWidth: uploadedImage.width,
        imageHeight: uploadedImage.height,
        imageBytes: uploadedImage.bytes,
        imageFormat: uploadedImage.format,
        imageResourceType: uploadedImage.resourceType,
        imageMimeType: uploadedImage.mimeType,
        imageFolder: uploadedImage.folder,
        imageVersion: uploadedImage.version,
        imageOriginalName: uploadedImage.originalName,
        imageUploadedAt: uploadedImage.uploadedAt,
      },
    });
  }

  console.log(`Productos demo con imagen cargados: ${DEMO_PRODUCTS.length}`);
}

main()
  .catch((error) => {
    console.error('Seed demo de productos fallo:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
