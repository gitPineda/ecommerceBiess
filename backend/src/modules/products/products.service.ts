import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsDto) {
    const where: Prisma.ProductWhereInput = {};

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { sku: { contains: query.search.trim().toUpperCase(), mode: 'insensitive' } },
        { category: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.categoryId?.trim()) {
      where.categoryId = query.categoryId.trim();
    }

    if (typeof query.featured === 'boolean') {
      where.featured = query.featured;
    }

    if (typeof query.isPromotion === 'boolean') {
      where.isPromotion = query.isPromotion;
    }

    const items = await this.prisma.product.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      take: query.limit || 50,
    });

    return {
      items: items.map((product) => this.mapProduct(product)),
      total: items.length,
    };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return this.mapProduct(product);
  }

  async create(payload: CreateProductDto, _actor: AuthenticatedUser) {
    const normalizedSku = payload.sku.trim().toUpperCase();
    const normalizedName = payload.name.trim();
    const isPromotion = Boolean(payload.isPromotion);
    const promotionDiscount = isPromotion ? payload.promotionDiscount || 0 : 0;

    const existingProduct = await this.prisma.product.findFirst({
      where: {
        OR: [
          { sku: normalizedSku },
          { name: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (existingProduct) {
      throw new BadRequestException('El producto ya existe. Usa un nombre o SKU distinto.');
    }

    const product = await this.prisma.product.create({
      data: {
        name: normalizedName,
        sku: normalizedSku,
        categoryId: payload.categoryId.trim(),
        category: payload.category.trim(),
        price: roundMoney(payload.price),
        stock: payload.stock,
        featured: Boolean(payload.featured),
        isPromotion,
        promotionDiscount,
        description: payload.description.trim(),
      },
    });

    return this.mapProduct(product);
  }

  private mapProduct(product: Product) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      category: product.category,
      price: Number(product.price),
      stock: product.stock,
      featured: product.featured,
      isPromotion: product.isPromotion,
      promotionDiscount: product.promotionDiscount,
      description: product.description,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      finalPrice: this.getFinalPrice(product),
    };
  }

  private getFinalPrice(product: Product) {
    const basePrice = Number(product.price);

    if (!product.isPromotion || product.promotionDiscount <= 0) {
      return basePrice;
    }

    return roundMoney(basePrice * (1 - product.promotionDiscount / 100));
  }
}
