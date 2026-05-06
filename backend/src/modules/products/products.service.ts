import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product, Prisma, User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditRequestContext } from '../audit/interfaces/audit-request-context.interface';
import { isAdminRole } from '../auth/auth-role.utils';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryProductImagesService } from './cloudinary-product-images.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

type UserWithSellerMetrics = User & {
  sellerRating: number | { toString(): string };
  sellerRatedProductsCount: number;
};

type ProductWithSeller = Product & {
  seller: UserWithSellerMetrics;
  productCategory: {
    id: string;
    name: string;
    icon: string;
  };
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cloudinaryProductImagesService: CloudinaryProductImagesService,
  ) {}

  async list(query: ListProductsDto) {
    const items = await this.prisma.product.findMany({
      where: this.buildWhere(query),
      include: {
        seller: true,
        productCategory: true,
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      take: query.limit || 50,
    });

    return {
      items: items.map((product) => this.mapProduct(product)),
      total: items.length,
    };
  }

  async listManaged(query: ListProductsDto, currentUser: AuthenticatedUser) {
    if (!isAdminRole(currentUser.role) && currentUser.role !== 'seller') {
      throw new ForbiddenException('No tienes permisos para gestionar productos.');
    }

    const where = this.buildWhere(query, { includeInactive: true });

    if (currentUser.role === 'seller') {
      where.sellerId = currentUser.userId;
    }

    const items = await this.prisma.product.findMany({
      where,
      include: {
        seller: true,
        productCategory: true,
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      take: query.limit || 100,
    });

    return {
      items: items.map((product) => this.mapProduct(product)),
      total: items.length,
    };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        productCategory: true,
      },
    });

    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return this.mapProduct(product);
  }

  async create(
    payload: CreateProductDto,
    actor: AuthenticatedUser,
    auditContext?: AuditRequestContext,
  ) {
    if (!isAdminRole(actor.role) && actor.role !== 'seller') {
      throw new ForbiddenException('No tienes permisos para crear productos.');
    }

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

    const seller = await this.resolveSellerForCreate(payload, actor);
    const category = await this.resolveCategoryForCreate(payload.categoryId);
    const uploadedImage = payload.imageBase64?.trim()
      ? await this.cloudinaryProductImagesService.uploadProductImage({
          base64: payload.imageBase64,
          mimeType: payload.imageMimeType || 'image/jpeg',
          fileName: payload.imageFileName || '',
          sellerId: seller.id,
          sku: normalizedSku,
        })
      : null;

    let product: ProductWithSeller;

    try {
      product = await this.prisma.product.create({
        data: {
          name: normalizedName,
          sku: normalizedSku,
          sellerId: seller.id,
          categoryId: category.id,
          category: category.name,
          price: roundMoney(payload.price),
          stock: payload.stock,
          isActive: true,
          featured: Boolean(payload.featured),
          isPromotion,
          promotionDiscount,
          description: payload.description.trim(),
          imageProvider: uploadedImage?.provider || null,
          imagePublicId: uploadedImage?.publicId || null,
          imageAssetId: uploadedImage?.assetId || null,
          imageUrl: uploadedImage?.url || null,
          imageSecureUrl: uploadedImage?.secureUrl || null,
          imageThumbUrl: uploadedImage?.thumbUrl || null,
          imageCardUrl: uploadedImage?.cardUrl || null,
          imageDetailUrl: uploadedImage?.detailUrl || null,
          imageWidth: uploadedImage?.width || null,
          imageHeight: uploadedImage?.height || null,
          imageBytes: uploadedImage?.bytes || null,
          imageFormat: uploadedImage?.format || null,
          imageResourceType: uploadedImage?.resourceType || null,
          imageMimeType: uploadedImage?.mimeType || null,
          imageFolder: uploadedImage?.folder || null,
          imageVersion: uploadedImage?.version || null,
          imageOriginalName: uploadedImage?.originalName || null,
          imageUploadedAt: uploadedImage?.uploadedAt || null,
        },
        include: {
          seller: true,
          productCategory: true,
        },
      });
    } catch (error) {
      await this.destroyUploadedImageQuietly(uploadedImage?.publicId);
      throw error;
    }

    await this.auditService.createEntry({
      userId: actor.userId,
      usuario: actor.email,
      actividad: 'PRODUCTO_CREADO',
      context: auditContext,
      detalle: {
        producto: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          sellerId: product.sellerId,
          sellerName: `${product.seller.firstName} ${product.seller.lastName}`.trim(),
          sellerEmail: product.seller.email,
          categoryId: product.categoryId,
          category: product.category,
          price: Number(product.price),
          stock: product.stock,
          isActive: product.isActive,
          featured: product.featured,
          isPromotion: product.isPromotion,
          promotionDiscount: product.promotionDiscount,
          hasImage: Boolean(product.imageSecureUrl || product.imageUrl),
          imagePublicId: product.imagePublicId,
        },
      },
    });

    return this.mapProduct(product);
  }

  async update(
    id: string,
    payload: UpdateProductDto,
    actor: AuthenticatedUser,
    auditContext?: AuditRequestContext,
  ) {
    if (!isAdminRole(actor.role) && actor.role !== 'seller') {
      throw new ForbiddenException('No tienes permisos para actualizar productos.');
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        productCategory: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Producto no encontrado.');
    }

    if (actor.role === 'seller' && product.sellerId !== actor.userId) {
      throw new ForbiddenException(
        'Solo puedes actualizar productos asignados a tu usuario vendedor.',
      );
    }

    const data: Prisma.ProductUpdateInput = {};
    const changes: Record<string, Prisma.InputJsonValue> = {};

    if (payload.name !== undefined) {
      const normalizedName = payload.name.trim();

      if (!normalizedName) {
        throw new BadRequestException('El nombre del producto no puede quedar vacio.');
      }

      if (normalizedName.toLowerCase() !== product.name.trim().toLowerCase()) {
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            id: {
              not: product.id,
            },
            name: {
              equals: normalizedName,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });

        if (existingProduct) {
          throw new BadRequestException(
            'Ya existe otro producto con ese nombre. Usa un nombre distinto.',
          );
        }
      }

      data.name = normalizedName;
      changes.name = {
        before: product.name,
        after: normalizedName,
      };
    }

    if (payload.price !== undefined) {
      const normalizedPrice = roundMoney(payload.price);
      data.price = normalizedPrice;
      changes.price = {
        before: Number(product.price),
        after: normalizedPrice,
      };
    }

    if (payload.stock !== undefined) {
      data.stock = payload.stock;
      changes.stock = {
        before: product.stock,
        after: payload.stock,
      };
    }

    if (payload.description !== undefined) {
      const normalizedDescription = payload.description.trim();

      if (!normalizedDescription) {
        throw new BadRequestException(
          'La descripcion del producto no puede quedar vacia.',
        );
      }

      data.description = normalizedDescription;
      changes.description = {
        before: product.description,
        after: normalizedDescription,
      };
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'Debes enviar al menos un campo valido para actualizar el producto.',
      );
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: product.id },
      data,
      include: {
        seller: true,
        productCategory: true,
      },
    });

    await this.auditService.createEntry({
      userId: actor.userId,
      usuario: actor.email,
      actividad: 'PRODUCTO_ACTUALIZADO',
      context: auditContext,
      detalle: {
        producto: {
          id: updatedProduct.id,
          sku: updatedProduct.sku,
          sellerId: updatedProduct.sellerId,
          sellerEmail: updatedProduct.seller.email,
        },
        cambios: changes,
      } as Prisma.InputJsonValue,
    });

    return this.mapProduct(updatedProduct);
  }

  private buildWhere(
    query: ListProductsDto,
    options: { includeInactive?: boolean } = {},
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (!options.includeInactive) {
      where.isActive = true;
    }

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

    if (query.sellerId?.trim()) {
      where.sellerId = query.sellerId.trim();
    }

    if (typeof query.featured === 'boolean') {
      where.featured = query.featured;
    }

    if (typeof query.isPromotion === 'boolean') {
      where.isPromotion = query.isPromotion;
    }

    return where;
  }

  private async resolveSellerForCreate(
    payload: CreateProductDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === 'seller') {
      if (payload.sellerId && payload.sellerId !== actor.userId) {
        throw new BadRequestException(
          'No puedes asignar productos a otro vendedor desde tu sesion.',
        );
      }

      const seller = await this.prisma.user.findUnique({
        where: { id: actor.userId },
      });

      if (!seller || seller.role !== 'seller') {
        throw new ForbiddenException('Tu usuario vendedor no es valido para esta operacion.');
      }

      return seller;
    }

    if (!payload.sellerId?.trim()) {
      throw new BadRequestException('Debes seleccionar un vendedor para el producto.');
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: payload.sellerId.trim() },
    });

    if (!seller || seller.role !== 'seller') {
      throw new BadRequestException('El vendedor seleccionado no es valido.');
    }

    return seller;
  }

  private async resolveCategoryForCreate(categoryId: string) {
    const normalizedCategoryId = categoryId.trim();

    if (!normalizedCategoryId) {
      throw new BadRequestException('Debes seleccionar una categoria.');
    }

    const category = await this.prisma.productCategory.findUnique({
      where: {
        id: normalizedCategoryId,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        isActive: true,
      },
    });

    if (!category || !category.isActive) {
      throw new BadRequestException('La categoria seleccionada no es valida.');
    }

    return category;
  }

  private mapProduct(product: ProductWithSeller) {
    const sellerName = `${product.seller.firstName} ${product.seller.lastName}`.trim();

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sellerId: product.sellerId,
      sellerName,
      sellerUsername: product.seller.username,
      sellerEmail: product.seller.email,
      sellerRating: Number(product.seller.sellerRating),
      sellerRatedProductsCount: product.seller.sellerRatedProductsCount,
      seller: {
        id: product.seller.id,
        fullName: sellerName,
        username: product.seller.username,
        email: product.seller.email,
        rating: Number(product.seller.sellerRating),
        ratedProductsCount: product.seller.sellerRatedProductsCount,
      },
      categoryId: product.categoryId,
      category: product.category,
      categoryIcon: product.productCategory?.icon || 'cube-outline',
      price: Number(product.price),
      stock: product.stock,
      isActive: product.isActive,
      archivedAt: product.archivedAt,
      deletedAt: product.deletedAt,
      featured: product.featured,
      isPromotion: product.isPromotion,
      promotionDiscount: product.promotionDiscount,
      description: product.description,
      imageProvider: product.imageProvider,
      imagePublicId: product.imagePublicId,
      imageAssetId: product.imageAssetId,
      imageUrl: product.imageSecureUrl || product.imageUrl,
      imageSecureUrl: product.imageSecureUrl,
      imageThumbUrl: product.imageThumbUrl,
      imageCardUrl: product.imageCardUrl,
      imageDetailUrl: product.imageDetailUrl,
      imageWidth: product.imageWidth,
      imageHeight: product.imageHeight,
      imageBytes: product.imageBytes,
      imageFormat: product.imageFormat,
      imageResourceType: product.imageResourceType,
      imageMimeType: product.imageMimeType,
      imageFolder: product.imageFolder,
      imageVersion: product.imageVersion,
      imageOriginalName: product.imageOriginalName,
      imageUploadedAt: product.imageUploadedAt,
      hasImage: Boolean(product.imageSecureUrl || product.imageUrl),
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

  private async destroyUploadedImageQuietly(publicId?: string | null) {
    if (!publicId) {
      return;
    }

    try {
      await this.cloudinaryProductImagesService.destroyImageByPublicId(publicId);
    } catch {
      // Avoid masking the original error if product persistence fails after upload.
    }
  }
}
