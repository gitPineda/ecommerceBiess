import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order, OrderItem, Prisma, Product, Role, User } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

type OrderWithRelations = Order & {
  user: User;
  items: Array<OrderItem & { product: Product }>;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser) {
    const orders = await this.prisma.order.findMany({
      where:
        currentUser.role === 'admin'
          ? undefined
          : {
              userId: currentUser.userId,
            },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: orders.map((order) => this.mapOrder(order)),
      total: orders.length,
    };
  }

  async getById(currentUser: AuthenticatedUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    if (currentUser.role !== 'admin' && order.userId !== currentUser.userId) {
      throw new ForbiddenException('No puedes consultar este pedido.');
    }

    return this.mapOrder(order);
  }

  async create(currentUser: AuthenticatedUser, payload: CreateOrderDto) {
    try {
      const order = await this.prisma.$transaction(
        async (tx) => {
          const productIds = payload.items.map((item) => item.productId);
          const products = await tx.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
          });

          if (products.length !== productIds.length) {
            throw new NotFoundException('Uno o mas productos no existen.');
          }

          const productMap = new Map(products.map((product) => [product.id, product]));
          let subtotal = 0;

          const normalizedItems = payload.items.map((item) => {
            const product = productMap.get(item.productId);

            if (!product) {
              throw new NotFoundException('Producto no encontrado.');
            }

            if (product.stock < item.quantity) {
              throw new BadRequestException(
                `No hay stock suficiente de ${product.name}.`,
              );
            }

            const unitPrice = this.getUnitPrice(product);
            subtotal += unitPrice * item.quantity;

            return {
              product,
              quantity: item.quantity,
              unitPrice,
            };
          });

          const normalizedSubtotal = roundMoney(subtotal);
          const tax = roundMoney(normalizedSubtotal * 0.12);
          const total = roundMoney(normalizedSubtotal + tax);

          const orderRecord = await tx.order.create({
            data: {
              userId: currentUser.userId,
              paymentMethod: payload.paymentMethod.trim(),
              subtotal: normalizedSubtotal,
              tax,
              total,
              shippingAddress: payload.shippingAddress as Prisma.InputJsonValue,
              items: {
                create: normalizedItems.map((item) => ({
                  productId: item.product.id,
                  productName: item.product.name,
                  productCategory: item.product.category,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                })),
              },
            },
            include: {
              user: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          });

          for (const item of normalizedItems) {
            await tx.product.update({
              where: { id: item.product.id },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
          }

          return tx.order.findUniqueOrThrow({
            where: { id: orderRecord.id },
            include: {
              user: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return this.mapOrder(order);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'El pedido entro en conflicto con otra operacion. Intenta nuevamente.',
        );
      }

      throw error;
    }
  }

  private getUnitPrice(product: Product) {
    const price = Number(product.price);

    if (!product.isPromotion || product.promotionDiscount <= 0) {
      return roundMoney(price);
    }

    return roundMoney(price * (1 - product.promotionDiscount / 100));
  }

  private mapOrder(order: OrderWithRelations) {
    return {
      id: order.id,
      user: {
        id: order.user.id,
        fullName: `${order.user.firstName} ${order.user.lastName}`.trim(),
        email: order.user.email,
        role: order.user.role === Role.ADMIN ? 'admin' : 'customer',
      },
      status: order.status.toLowerCase(),
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        category: item.productCategory,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        currentStock: item.product.stock,
      })),
    };
  }
}
