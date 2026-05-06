import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ProductCategory } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditRequestContext } from '../audit/interfaces/audit-request-context.interface';
import { isAdminRole } from '../auth/auth-role.utils';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';

function buildCategoryId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'general';
}

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listPublic() {
    const items = await this.prisma.productCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      items: items.map((item) => this.mapCategory(item)),
      total: items.length,
    };
  }

  async listManaged(currentUser: AuthenticatedUser) {
    if (!isAdminRole(currentUser.role)) {
      throw new ForbiddenException(
        'Solo el administrador puede gestionar categorias.',
      );
    }

    const items = await this.prisma.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      items: items.map((item) => this.mapCategory(item)),
      total: items.length,
    };
  }

  async create(
    payload: CreateProductCategoryDto,
    currentUser: AuthenticatedUser,
    auditContext?: AuditRequestContext,
  ) {
    if (!isAdminRole(currentUser.role)) {
      throw new ForbiddenException(
        'Solo el administrador puede crear categorias.',
      );
    }

    const normalizedName = payload.name.trim();
    const categoryId = buildCategoryId(normalizedName);
    const normalizedIcon = payload.icon.trim();

    const existing = await this.prisma.productCategory.findFirst({
      where: {
        OR: [
          { id: categoryId },
          { name: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'La categoria ya existe. Usa otro nombre.',
      );
    }

    const category = await this.prisma.productCategory.create({
      data: {
        id: categoryId,
        name: normalizedName,
        icon: normalizedIcon,
        description: payload.description?.trim() || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: true,
      },
    });

    await this.auditService.createEntry({
      userId: currentUser.userId,
      usuario: currentUser.email,
      actividad: 'CATEGORIA_CREADA',
      context: auditContext,
      detalle: {
        categoria: this.mapCategory(category),
      },
    });

    return this.mapCategory(category);
  }

  private mapCategory(category: ProductCategory) {
    return {
      id: category.id,
      label: category.name,
      name: category.name,
      icon: category.icon,
      description: category.description,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
