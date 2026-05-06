import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderFlowStatus,
  OrderItem,
  OrderStatus as LegacyOrderStatus,
  OrderStatusHistory,
  PaymentStatus,
  Prisma,
  Product,
  User,
} from '@prisma/client';
import {
  CASH_ON_DELIVERY_PAYMENT_METHOD,
  CASH_ON_DELIVERY_PROVIDER,
  COD_DELIVERY_OTP_LENGTH,
  PAYPHONE_DEFAULT_COUNTRY_CODE,
  PAYPHONE_PAYMENT_METHOD,
  PAYPHONE_PENDING_MINUTES,
  PAYPHONE_PROVIDER,
  SupportedPaymentMethod,
} from '../../config/commerce';
import {
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_COMPANY_SINGLETON_KEY,
} from '../../config/default-company';
import { AuditService } from '../audit/audit.service';
import { AuditRequestContext } from '../audit/interfaces/audit-request-context.interface';
import { isAdminRole, mapPrismaRole } from '../auth/auth-role.utils';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  PayphoneService,
  PayphoneTransactionResponse,
} from '../payphone/payphone.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmDeliveryOtpDto } from './dto/confirm-delivery-otp.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { RateCustomerDto } from './dto/rate-customer.dto';
import { RateOrderDto } from './dto/rate-order.dto';

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toCents(value: number) {
  return Math.round(roundMoney(value) * 100);
}

function addMinutes(baseDate: Date, minutes: number) {
  return new Date(baseDate.getTime() + minutes * 60 * 1000);
}

const COD_FINAL_STATUSES = [
  OrderFlowStatus.COMPLETADO,
  OrderFlowStatus.CANCELADO,
  OrderFlowStatus.RECHAZADO,
] as const;

const OTP_VISIBLE_STATUSES = new Set<OrderFlowStatus>([
  OrderFlowStatus.CONFIRMADO,
  OrderFlowStatus.EN_PREPARACION,
  OrderFlowStatus.EN_CAMINO,
  OrderFlowStatus.ENTREGADO,
  OrderFlowStatus.PAGADO,
  OrderFlowStatus.COMPLETADO,
]);

const ORDER_INCLUDE = {
  user: true,
  assignedSeller: true,
  statusHistory: {
    include: {
      changedByUser: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  items: {
    include: {
      product: true,
      seller: true,
    },
  },
} satisfies Prisma.OrderInclude;

type UserWithMetrics = User & {
  sellerRating: number | { toString(): string };
  sellerStarsTotal: number;
  sellerRatedProductsCount: number;
  customerRating: number | { toString(): string };
  customerStarsTotal: number;
  customerRatedOrdersCount: number;
};

type OrderItemWithRelations = OrderItem & {
  product: Product;
  seller: UserWithMetrics;
};

type OrderStatusHistoryWithRelations = OrderStatusHistory & {
  changedByUser: User;
};

type OrderWithRelations = Order & {
  user: UserWithMetrics;
  assignedSeller: UserWithMetrics | null;
  items: OrderItemWithRelations[];
  statusHistory: OrderStatusHistoryWithRelations[];
};

type SalesOrderItem = OrderItemWithRelations & {
  order: Order & {
    user: User;
    assignedSeller: User | null;
  };
};

type NormalizedOrderItem = {
  product: Product & { seller: UserWithMetrics };
  quantity: number;
  unitPrice: number;
};

type OrderViewer = AuthenticatedUser | null | undefined;

type PayphoneHandledError = Error & {
  payphoneHandled?: boolean;
};

type LifecycleUpdateInput = {
  nextOrderStatus: OrderFlowStatus;
  nextPaymentStatus: PaymentStatus;
  activity: string;
  note: string;
  metadata?: Prisma.InputJsonValue;
  restoreStock?: boolean;
  extraData?: Prisma.OrderUpdateInput;
};

type CompanyVatSelection = {
  vatRate: Prisma.Decimal | number;
  vatPercent: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly payphoneService: PayphoneService,
  ) {}

  async list(currentUser: AuthenticatedUser) {
    if (currentUser.role === 'seller') {
      throw new ForbiddenException(
        'Los vendedores consultan sus pedidos de contra entrega desde su modulo operativo.',
      );
    }

    const orders = await this.prisma.order.findMany({
      where: isAdminRole(currentUser.role)
        ? undefined
        : {
            userId: currentUser.userId,
          },
      include: ORDER_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: orders.map((order) => this.mapOrder(order, currentUser)),
      total: orders.length,
    };
  }

  async listAssigned(currentUser: AuthenticatedUser) {
    if (!isAdminRole(currentUser.role) && currentUser.role !== 'seller') {
      throw new ForbiddenException(
        'Solo vendedores y administradores pueden consultar pedidos COD.',
      );
    }

    const orders = await this.prisma.order.findMany({
      where: {
        paymentMethod: CASH_ON_DELIVERY_PAYMENT_METHOD,
        ...(currentUser.role === 'seller'
          ? {
              assignedSellerId: currentUser.userId,
            }
          : {}),
      },
      include: ORDER_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return {
      items: orders.map((order) => this.mapOrder(order, currentUser)),
      total: orders.length,
    };
  }

  async listSales(currentUser: AuthenticatedUser) {
    if (!isAdminRole(currentUser.role) && currentUser.role !== 'seller') {
      throw new ForbiddenException(
        'Solo administradores y vendedores pueden ver ventas.',
      );
    }

    const saleItems = await this.prisma.orderItem.findMany({
      where: {
        ...(currentUser.role === 'seller'
          ? {
              sellerId: currentUser.userId,
            }
          : {}),
        order: {
          paymentStatus: PaymentStatus.PAID,
        },
      },
      include: {
        order: {
          include: {
            user: true,
            assignedSeller: true,
          },
        },
        product: true,
        seller: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const salesMap = new Map<string, ReturnType<OrdersService['createSaleRecord']>>();

    saleItems.forEach((item) => {
      const key = `${item.orderId}:${item.sellerId}`;
      const existing = salesMap.get(key) || this.createSaleRecord(item);
      const lineTotal = roundMoney(Number(item.unitPrice) * item.quantity);

      existing.items.push({
        id: item.id,
        productId: item.productId,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        name: item.productName,
        category: item.productCategory,
        imageUrl:
          item.productThumbUrl ||
          item.productImageUrl ||
          item.product.imageThumbUrl ||
          item.product.imageSecureUrl ||
          item.product.imageUrl ||
          '',
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        lineTotal,
        customerRating: item.customerRating,
        ratedAt: item.ratedAt,
        currentStock: item.product.stock,
      });
      existing.subtotal = roundMoney(existing.subtotal + lineTotal);
      existing.totalUnits += item.quantity;
      existing.tax =
        existing._orderSubtotal > 0
          ? roundMoney((existing.subtotal / existing._orderSubtotal) * existing._orderTax)
          : 0;
      existing.total = roundMoney(existing.subtotal + existing.tax);
      salesMap.set(key, existing);
    });

    const items = [...salesMap.values()]
      .map(({ _orderSubtotal, _orderTax, ...sale }) => sale)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );

    return {
      items,
      total: items.length,
    };
  }

  async getById(currentUser: AuthenticatedUser, id: string) {
    const order = await this.getAccessibleOrder(currentUser, id);
    return this.mapOrder(order, currentUser);
  }

  async getRatings(currentUser: AuthenticatedUser, id: string) {
    const order = await this.getAccessibleOrder(currentUser, id);

    return {
      orderId: order.id,
      orderStatus: this.mapOrderStatus(order.orderStatus),
      paymentStatus: this.mapPaymentStatus(order.paymentStatus),
      customerRatedAt: order.customerRatedAt,
      sellerCustomerRating: order.sellerCustomerRating,
      sellerCustomerRatedAt: order.sellerCustomerRatedAt,
      customerCanRateSeller: this.canCustomerRateSeller(order, currentUser),
      sellerCanRateCustomer: this.canSellerRateCustomer(order, currentUser),
      customer: this.mapCustomerUser(order.user),
      assignedSeller: this.mapSellerUser(order.assignedSeller),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        stars: item.customerRating,
        ratedAt: item.ratedAt,
      })),
    };
  }

  async create(
    currentUser: AuthenticatedUser,
    payload: CreateOrderDto,
    auditContext?: AuditRequestContext,
  ) {
    const paymentMethod = this.normalizePaymentMethod(payload.paymentMethod);
    const countryCode = this.resolveCountryCode(payload.countryCode);
    const normalizedPhoneNumber =
      paymentMethod === PAYPHONE_PAYMENT_METHOD
        ? this.resolveCustomerPhoneNumber(payload.phoneNumber)
        : null;
    const contactPhoneNumber =
      paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD
        ? this.resolveContactPhoneNumber(payload.phoneNumber)
        : null;

    let createdOrderId = '';

    try {
      const createdOrder = await this.prisma.$transaction(
        async (tx) => {
          const normalizedItems = await this.loadNormalizedItems(tx, payload.items);
          const vatConfig = await this.getCurrentVatConfig(tx);
          const totals = this.calculateTotals(normalizedItems, vatConfig.vatRate);
          const assignedSellerId = this.resolveAssignedSellerId(
            normalizedItems,
            paymentMethod,
          );
          const now = new Date();
          const payphoneClientTransactionId =
            paymentMethod === PAYPHONE_PAYMENT_METHOD
              ? this.buildClientTransactionId(currentUser.userId)
              : null;
          const deliveryOtp =
            paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD
              ? this.generateDeliveryOtp()
              : null;

          const orderRecord = await tx.order.create({
            data: {
              userId: currentUser.userId,
              status: this.mapLegacyStatus(
                OrderFlowStatus.PENDIENTE,
                PaymentStatus.PENDING,
                paymentMethod,
              ),
              orderStatus: OrderFlowStatus.PENDIENTE,
              paymentStatus: PaymentStatus.PENDING,
              paymentMethod,
              paymentProvider:
                paymentMethod === PAYPHONE_PAYMENT_METHOD
                  ? PAYPHONE_PROVIDER
                  : CASH_ON_DELIVERY_PROVIDER,
              assignedSellerId,
              customerPhoneNumber: normalizedPhoneNumber || contactPhoneNumber,
              customerCountryCode:
                paymentMethod === PAYPHONE_PAYMENT_METHOD ? countryCode : null,
              deliveryOtp,
              deliveryOtpGeneratedAt:
                paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD ? now : null,
              subtotal: totals.subtotal,
              tax: totals.tax,
              total: totals.total,
              shippingAddress: payload.shippingAddress as Prisma.InputJsonValue,
              paymentExpiresAt:
                paymentMethod === PAYPHONE_PAYMENT_METHOD
                  ? addMinutes(now, PAYPHONE_PENDING_MINUTES)
                  : null,
              payphoneClientTransactionId,
              items: {
                create: normalizedItems.map((item) => ({
                  productId: item.product.id,
                  sellerId: item.product.sellerId,
                  sellerName: `${item.product.seller.firstName} ${item.product.seller.lastName}`.trim(),
                  productName: item.product.name,
                  productCategory: item.product.category,
                  productImageUrl:
                    item.product.imageSecureUrl || item.product.imageUrl || null,
                  productThumbUrl:
                    item.product.imageThumbUrl ||
                    item.product.imageSecureUrl ||
                    item.product.imageUrl ||
                    null,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                })),
              },
            },
            include: ORDER_INCLUDE,
          });

          await this.decrementReservedStock(tx, normalizedItems);
          await this.syncCustomerPhoneNumber(
            tx,
            orderRecord.userId,
            orderRecord.user.phoneNumber,
            normalizedPhoneNumber || contactPhoneNumber,
          );

          await this.appendStatusHistory(tx, {
            orderId: orderRecord.id,
            fromStatus: null,
            toStatus: OrderFlowStatus.PENDIENTE,
            currentUser,
            note:
              paymentMethod === PAYPHONE_PAYMENT_METHOD
                ? 'Pedido creado a la espera de aprobacion de pago.'
                : 'Pedido contra entrega creado y pendiente de revision del vendedor.',
            metadata: this.sanitizeJson({
              paymentMethod,
              assignedSellerId,
            }),
          });

          await this.auditService.createEntry({
            tx,
            userId: currentUser.userId,
            usuario: currentUser.email,
            actividad: 'COMPRA_REALIZADA',
            context: auditContext,
            detalle: {
              cabecera: {
                pedidoId: orderRecord.id,
                paymentMethod: orderRecord.paymentMethod,
                paymentProvider: orderRecord.paymentProvider,
                orderStatus: this.mapOrderStatus(orderRecord.orderStatus),
                paymentStatus: this.mapPaymentStatus(orderRecord.paymentStatus),
                subtotal: Number(orderRecord.subtotal),
                tax: Number(orderRecord.tax),
                total: Number(orderRecord.total),
                vatRate: vatConfig.vatRate,
                vatPercent: vatConfig.vatPercent,
                customerPhoneNumber: orderRecord.customerPhoneNumber,
                assignedSellerId: orderRecord.assignedSellerId,
                shippingAddress: payload.shippingAddress as Prisma.InputJsonValue,
                deliveryOtpGenerated:
                  paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD,
                fechaHora: orderRecord.createdAt.toISOString(),
              },
              detalle: orderRecord.items.map((item) => ({
                itemId: item.id,
                productId: item.productId,
                sellerId: item.sellerId,
                sellerName: item.sellerName,
                productName: item.productName,
                productCategory: item.productCategory,
                unitPrice: Number(item.unitPrice),
                quantity: item.quantity,
              })),
            },
          });

          return orderRecord;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      createdOrderId = createdOrder.id;

      if (paymentMethod !== PAYPHONE_PAYMENT_METHOD) {
        return this.mapOrder(createdOrder, currentUser);
      }

      const payphoneResponse = await this.payphoneService.createSale({
        clientTransactionId: createdOrder.payphoneClientTransactionId || '',
        phoneNumber: normalizedPhoneNumber!,
        countryCode,
        amount: toCents(Number(createdOrder.total)),
        amountWithoutTax: 0,
        amountWithTax: toCents(Number(createdOrder.subtotal)),
        tax: toCents(Number(createdOrder.tax)),
        service: 0,
        tip: 0,
        reference: `Pedido ${createdOrder.id}`,
        timeZone: -5,
        lat: '-1.831239',
        lng: '-78.183406',
        clientUserId: currentUser.userId,
        optionalParameter1: createdOrder.id,
        optionalParameter2: currentUser.email,
        optionalParameter3: createdOrder.paymentMethod,
        order: this.buildPayphoneOrderPayload(
          createdOrder,
          normalizedPhoneNumber!,
          auditContext,
        ),
      });

      const syncedOrder = await this.syncPayphoneOrderFromResponse(
        currentUser,
        createdOrder.id,
        payphoneResponse,
        auditContext,
        'PAGO_PAYPHONE_ACTUALIZADO',
      );

      if (
        syncedOrder.paymentStatus === PaymentStatus.CANCELED ||
        syncedOrder.paymentStatus === PaymentStatus.FAILED
      ) {
        const handledError = new BadGatewayException(
          syncedOrder.payphoneMessage ||
            'PayPhone no aprobo la transaccion solicitada.',
        ) as BadGatewayException & PayphoneHandledError;
        handledError.payphoneHandled = true;
        throw handledError;
      }

      return this.mapOrder(syncedOrder, currentUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'El pedido entro en conflicto con otra operacion. Intenta nuevamente.',
        );
      }

      if (this.isHandledPayphoneError(error)) {
        throw error;
      }

      if (createdOrderId && paymentMethod === PAYPHONE_PAYMENT_METHOD) {
        await this.markPaymentInitializationFailure(
          createdOrderId,
          currentUser,
          auditContext,
          error,
        );
      }

      throw error;
    }
  }

  async refreshPayphoneStatus(
    currentUser: AuthenticatedUser,
    id: string,
    auditContext?: AuditRequestContext,
  ) {
    const order = await this.getAccessibleOrder(currentUser, id);

    if (
      order.paymentProvider !== PAYPHONE_PROVIDER ||
      !order.payphoneClientTransactionId
    ) {
      throw new BadRequestException(
        'El pedido indicado no tiene un pago PayPhone asociado.',
      );
    }

    const payphoneResponse =
      await this.payphoneService.getSaleByClientTransactionId(
        order.payphoneClientTransactionId,
      );

    const updatedOrder = await this.syncPayphoneOrderFromResponse(
      currentUser,
      order.id,
      payphoneResponse,
      auditContext,
      'PAGO_PAYPHONE_ACTUALIZADO',
    );

    return this.mapOrder(updatedOrder, currentUser);
  }

  async acceptCashOnDeliveryOrder(
    currentUser: AuthenticatedUser,
    id: string,
    auditContext?: AuditRequestContext,
  ) {
    return this.transitionSellerCodOrder(
      currentUser,
      id,
      {
        allowedFrom: [OrderFlowStatus.PENDIENTE],
        nextOrderStatus: OrderFlowStatus.CONFIRMADO,
        nextPaymentStatus: PaymentStatus.PENDING,
        activity: 'PEDIDO_COD_CONFIRMADO',
        note: 'Pedido aceptado por el vendedor.',
        metadata: this.sanitizeJson({
          action: 'accept',
        }),
        extraData: {
          confirmedAt: new Date(),
        },
      },
      auditContext,
    );
  }

  async rejectCashOnDeliveryOrder(
    currentUser: AuthenticatedUser,
    id: string,
    auditContext?: AuditRequestContext,
  ) {
    return this.transitionSellerCodOrder(
      currentUser,
      id,
      {
        allowedFrom: [OrderFlowStatus.PENDIENTE],
        nextOrderStatus: OrderFlowStatus.RECHAZADO,
        nextPaymentStatus: PaymentStatus.CANCELED,
        activity: 'PEDIDO_COD_RECHAZADO',
        note: 'Pedido rechazado por el vendedor.',
        metadata: this.sanitizeJson({
          action: 'reject',
        }),
        restoreStock: true,
        extraData: {
          rejectedAt: new Date(),
        },
      },
      auditContext,
    );
  }

  async markCashOnDeliveryInPreparation(
    currentUser: AuthenticatedUser,
    id: string,
    auditContext?: AuditRequestContext,
  ) {
    return this.transitionSellerCodOrder(
      currentUser,
      id,
      {
        allowedFrom: [OrderFlowStatus.CONFIRMADO],
        nextOrderStatus: OrderFlowStatus.EN_PREPARACION,
        nextPaymentStatus: PaymentStatus.PENDING,
        activity: 'PEDIDO_COD_EN_PREPARACION',
        note: 'Pedido marcado en preparacion.',
        metadata: this.sanitizeJson({
          action: 'preparing',
        }),
        extraData: {
          preparingAt: new Date(),
        },
      },
      auditContext,
    );
  }

  async markCashOnDeliveryInTransit(
    currentUser: AuthenticatedUser,
    id: string,
    auditContext?: AuditRequestContext,
  ) {
    return this.transitionSellerCodOrder(
      currentUser,
      id,
      {
        allowedFrom: [
          OrderFlowStatus.CONFIRMADO,
          OrderFlowStatus.EN_PREPARACION,
        ],
        nextOrderStatus: OrderFlowStatus.EN_CAMINO,
        nextPaymentStatus: PaymentStatus.PENDING,
        activity: 'PEDIDO_COD_EN_CAMINO',
        note: 'Pedido marcado en camino.',
        metadata: this.sanitizeJson({
          action: 'in_transit',
        }),
        extraData: {
          inTransitAt: new Date(),
        },
      },
      auditContext,
    );
  }

  async confirmCashOnDeliveryWithOtp(
    currentUser: AuthenticatedUser,
    id: string,
    payload: ConfirmDeliveryOtpDto,
    auditContext?: AuditRequestContext,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.getSellerManagedOrderForUpdate(
          tx,
          currentUser,
          id,
          [OrderFlowStatus.EN_CAMINO, OrderFlowStatus.PAGADO],
        );

        if (!order.deliveryOtp) {
          throw new BadRequestException(
            'El pedido no tiene un codigo OTP configurado.',
          );
        }

        if (order.deliveryOtp !== payload.otp.trim()) {
          throw new BadRequestException(
            'El codigo OTP ingresado no es correcto.',
          );
        }

        const nextOrderStatus =
          order.paymentStatus === PaymentStatus.PAID
            ? OrderFlowStatus.COMPLETADO
            : OrderFlowStatus.ENTREGADO;

        const updatedOrder = await this.updateOrderLifecycle(tx, order, currentUser, {
          nextOrderStatus,
          nextPaymentStatus: order.paymentStatus,
          activity: 'PEDIDO_COD_ENTREGADO',
          note:
            nextOrderStatus === OrderFlowStatus.COMPLETADO
              ? 'Entrega confirmada con OTP y pedido completado.'
              : 'Entrega confirmada con OTP.',
          metadata: this.sanitizeJson({
            action: 'confirm_delivery_otp',
          }),
          extraData: {
            deliveredAt: order.deliveredAt || new Date(),
            deliveryOtpVerifiedAt: order.deliveryOtpVerifiedAt || new Date(),
            completedAt:
              nextOrderStatus === OrderFlowStatus.COMPLETADO
                ? order.completedAt || new Date()
                : order.completedAt,
          },
        }, auditContext);

        return this.mapOrder(updatedOrder, currentUser);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async confirmCashOnDeliveryPayment(
    currentUser: AuthenticatedUser,
    id: string,
    payload: ConfirmPaymentDto,
    auditContext?: AuditRequestContext,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.getSellerManagedOrderForUpdate(
          tx,
          currentUser,
          id,
          [
            OrderFlowStatus.EN_CAMINO,
            OrderFlowStatus.ENTREGADO,
            OrderFlowStatus.PAGADO,
          ],
        );

        if (order.paymentStatus === PaymentStatus.PAID) {
          throw new BadRequestException(
            'El pago de este pedido ya fue confirmado.',
          );
        }

        const nextOrderStatus =
          order.orderStatus === OrderFlowStatus.ENTREGADO
            ? OrderFlowStatus.COMPLETADO
            : OrderFlowStatus.PAGADO;

        const updatedOrder = await this.updateOrderLifecycle(tx, order, currentUser, {
          nextOrderStatus,
          nextPaymentStatus: PaymentStatus.PAID,
          activity: 'PEDIDO_COD_PAGADO',
          note:
            nextOrderStatus === OrderFlowStatus.COMPLETADO
              ? 'Pago contra entrega confirmado y pedido completado.'
              : 'Pago contra entrega confirmado.',
          metadata: this.sanitizeJson({
            action: 'confirm_payment',
            note: payload.note?.trim() || null,
          }),
          extraData: {
            paidAt: order.paidAt || new Date(),
            completedAt:
              nextOrderStatus === OrderFlowStatus.COMPLETADO
                ? order.completedAt || new Date()
                : order.completedAt,
          },
        }, auditContext);

        return this.mapOrder(updatedOrder, currentUser);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async rateOrder(
    currentUser: AuthenticatedUser,
    id: string,
    payload: RateOrderDto,
    auditContext?: AuditRequestContext,
  ) {
    if (currentUser.role !== 'customer') {
      throw new ForbiddenException(
        'Solo los clientes pueden calificar productos comprados.',
      );
    }

    const order = await this.getAccessibleOrder(currentUser, id);

    if (!this.isOrderCompleted(order.orderStatus)) {
      throw new BadRequestException(
        'Solo puedes calificar pedidos completados.',
      );
    }

    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'Solo puedes calificar pedidos con pago confirmado.',
      );
    }

    if (order.customerRatedAt) {
      throw new BadRequestException(
        'Ya registraste tu calificacion para este pedido.',
      );
    }

    const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
    const duplicateItemIds = new Set<number>();
    const seenItemIds = new Set<number>();

    payload.ratings.forEach((rating) => {
      if (seenItemIds.has(rating.orderItemId)) {
        duplicateItemIds.add(rating.orderItemId);
      }
      seenItemIds.add(rating.orderItemId);
    });

    if (duplicateItemIds.size) {
      throw new BadRequestException(
        'No puedes enviar la misma calificacion mas de una vez para un producto.',
      );
    }

    if (payload.ratings.length !== order.items.length) {
      throw new BadRequestException(
        'Debes calificar todos los productos del pedido en un solo envio.',
      );
    }

    order.items.forEach((item) => {
      const submitted = payload.ratings.find(
        (rating) => rating.orderItemId === item.id,
      );

      if (!submitted) {
        throw new BadRequestException(
          `Falta la calificacion del producto ${item.productName}.`,
        );
      }

      if (item.customerRating !== null) {
        throw new BadRequestException(
          `El producto ${item.productName} ya fue calificado anteriormente.`,
        );
      }
    });

    const updatedOrder = await this.prisma.$transaction(
      async (tx) => {
        const sellerAccumulators = new Map<
          string,
          { starsTotal: number; ratingsCount: number }
        >();
        const now = new Date();

        for (const rating of payload.ratings) {
          const orderItem = orderItemsById.get(
            rating.orderItemId,
          ) as OrderItemWithRelations | undefined;

          if (!orderItem) {
            throw new BadRequestException(
              'Una de las calificaciones no pertenece al pedido indicado.',
            );
          }

          await tx.orderItem.update({
            where: {
              id: orderItem.id,
            },
            data: {
              customerRating: rating.stars,
              ratedAt: now,
            },
          });

          const currentSellerAccumulator = sellerAccumulators.get(orderItem.sellerId) || {
            starsTotal: 0,
            ratingsCount: 0,
          };

          currentSellerAccumulator.starsTotal += rating.stars;
          currentSellerAccumulator.ratingsCount += 1;
          sellerAccumulators.set(orderItem.sellerId, currentSellerAccumulator);
        }

        for (const [sellerId, accumulator] of sellerAccumulators.entries()) {
          const seller = (await tx.user.findUnique({
            where: {
              id: sellerId,
            },
          })) as UserWithMetrics | null;

          if (!seller) {
            continue;
          }

          const nextStarsTotal = seller.sellerStarsTotal + accumulator.starsTotal;
          const nextRatingsCount =
            seller.sellerRatedProductsCount + accumulator.ratingsCount;
          const nextRating =
            nextRatingsCount > 0 ? roundMoney(nextStarsTotal / nextRatingsCount) : 0;

          await tx.user.update({
            where: {
              id: sellerId,
            },
            data: {
              sellerStarsTotal: nextStarsTotal,
              sellerRatedProductsCount: nextRatingsCount,
              sellerRating: nextRating,
            },
          });
        }

        const refreshedOrder = await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            customerRatedAt: now,
          },
          include: ORDER_INCLUDE,
        });

        await this.auditService.createEntry({
          tx,
          userId: currentUser.userId,
          usuario: currentUser.email,
          actividad: 'VENDEDOR_CALIFICADO_POR_CLIENTE',
          context: auditContext,
          detalle: {
            pedidoId: order.id,
            ratings: payload.ratings.map((rating) => {
              const orderItem = orderItemsById.get(
                rating.orderItemId,
              ) as OrderItemWithRelations;
              return {
                orderItemId: rating.orderItemId,
                productId: orderItem.productId,
                productName: orderItem.productName,
                sellerId: orderItem.sellerId,
                sellerName: orderItem.sellerName,
                stars: rating.stars,
              };
            }),
          },
        });

        return refreshedOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return this.mapOrder(updatedOrder, currentUser);
  }

  async rateCustomer(
    currentUser: AuthenticatedUser,
    id: string,
    payload: RateCustomerDto,
    auditContext?: AuditRequestContext,
  ) {
    if (currentUser.role !== 'seller') {
      throw new ForbiddenException(
        'Solo el vendedor asignado puede calificar al cliente.',
      );
    }

    const updatedOrder = await this.prisma.$transaction(
      async (tx) => {
        const order = await this.getSellerManagedOrderForUpdate(
          tx,
          currentUser,
          id,
          [OrderFlowStatus.COMPLETADO],
        );

        if (order.paymentStatus !== PaymentStatus.PAID) {
          throw new BadRequestException(
            'Solo puedes calificar clientes en pedidos pagados.',
          );
        }

        if (order.sellerCustomerRatedAt) {
          throw new BadRequestException(
            'Ya registraste tu calificacion para este cliente en este pedido.',
          );
        }

        const ratedCustomer = (await tx.user.findUnique({
          where: {
            id: order.userId,
          },
        })) as UserWithMetrics | null;

        if (!ratedCustomer) {
          throw new NotFoundException('Cliente no encontrado.');
        }

        const nextStarsTotal = ratedCustomer.customerStarsTotal + payload.stars;
        const nextRatingsCount = ratedCustomer.customerRatedOrdersCount + 1;
        const nextRating =
          nextRatingsCount > 0 ? roundMoney(nextStarsTotal / nextRatingsCount) : 0;
        const now = new Date();

        await tx.user.update({
          where: {
            id: ratedCustomer.id,
          },
          data: {
            customerStarsTotal: nextStarsTotal,
            customerRatedOrdersCount: nextRatingsCount,
            customerRating: nextRating,
          },
        });

        const refreshedOrder = await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            sellerCustomerRating: payload.stars,
            sellerCustomerRatedAt: now,
          },
          include: ORDER_INCLUDE,
        });

        await this.auditService.createEntry({
          tx,
          userId: currentUser.userId,
          usuario: currentUser.email,
          actividad: 'CLIENTE_CALIFICADO_POR_VENDEDOR',
          context: auditContext,
          detalle: {
            pedidoId: order.id,
            customerId: order.userId,
            stars: payload.stars,
          },
        });

        return refreshedOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return this.mapOrder(updatedOrder, currentUser);
  }

  private async syncPayphoneOrderFromResponse(
    currentUser: AuthenticatedUser,
    orderId: string,
    response: PayphoneTransactionResponse,
    auditContext: AuditRequestContext | undefined,
    activity: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: ORDER_INCLUDE,
        });

        if (!order) {
          throw new NotFoundException('Pedido no encontrado.');
        }

        this.assertOrderAccess(currentUser, order);

        const nextLifecycle = this.resolvePayphoneLifecycle(response, order);
        const shouldRestoreStock =
          order.paymentStatus === PaymentStatus.PENDING &&
          nextLifecycle.paymentStatus !== PaymentStatus.PENDING &&
          nextLifecycle.paymentStatus !== PaymentStatus.PAID;

        const updatedOrder = await this.updateOrderLifecycle(tx, order, currentUser, {
          nextOrderStatus: nextLifecycle.orderStatus,
          nextPaymentStatus: nextLifecycle.paymentStatus,
          activity,
          note: this.buildPayphoneTransitionNote(nextLifecycle.orderStatus),
          metadata: this.sanitizeJson({
            payphone: {
              transactionId: this.readString(response.transactionId),
              transactionStatus: this.readString(response.transactionStatus),
              statusCode: this.readNumber(response.statusCode),
              authorizationCode: this.readString(response.authorizationCode),
              message: this.readString(response.message),
              messageCode: this.readNumber(response.messageCode),
            },
          }),
          restoreStock: shouldRestoreStock,
          extraData: {
            paymentApprovedAt:
              nextLifecycle.paymentStatus === PaymentStatus.PAID
                ? order.paymentApprovedAt || new Date()
                : order.paymentApprovedAt,
            paidAt: nextLifecycle.paidAt || order.paidAt,
            completedAt: nextLifecycle.completedAt || order.completedAt,
            cancelledAt: nextLifecycle.cancelledAt || order.cancelledAt,
            payphoneTransactionId:
              this.readString(response.transactionId) || order.payphoneTransactionId,
            payphoneTransactionStatus:
              this.readString(response.transactionStatus) ||
              order.payphoneTransactionStatus,
            payphoneStatusCode:
              this.readNumber(response.statusCode) ?? order.payphoneStatusCode,
            payphoneAuthorizationCode:
              this.readString(response.authorizationCode) ||
              order.payphoneAuthorizationCode,
            payphoneMessage:
              this.readString(response.message) || order.payphoneMessage,
            payphoneMessageCode:
              this.readNumber(response.messageCode) ?? order.payphoneMessageCode,
            payphoneResponse: this.sanitizeJson(response),
          },
        }, auditContext);

        return updatedOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async markPaymentInitializationFailure(
    orderId: string,
    currentUser: AuthenticatedUser,
    auditContext: AuditRequestContext | undefined,
    error: unknown,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: ORDER_INCLUDE,
        });

        if (!order || order.paymentStatus !== PaymentStatus.PENDING) {
          return;
        }

        await this.updateOrderLifecycle(tx, order, currentUser, {
          nextOrderStatus: OrderFlowStatus.CANCELADO,
          nextPaymentStatus: PaymentStatus.FAILED,
          activity: 'PAGO_PAYPHONE_FALLIDO',
          note: 'La inicializacion del pago PayPhone fallo.',
          metadata: this.sanitizeJson({
            error: this.getErrorMessage(error),
          }),
          restoreStock: true,
          extraData: {
            cancelledAt: order.cancelledAt || new Date(),
            payphoneTransactionStatus: 'Failed',
            payphoneMessage: this.getErrorMessage(error),
            payphoneResponse: this.sanitizeJson({
              error: this.getErrorMessage(error),
            }),
          },
        }, auditContext);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async transitionSellerCodOrder(
    currentUser: AuthenticatedUser,
    orderId: string,
    input: LifecycleUpdateInput & {
      allowedFrom: OrderFlowStatus[];
    },
    auditContext?: AuditRequestContext,
  ) {
    if (currentUser.role !== 'seller') {
      throw new ForbiddenException(
        'Solo el vendedor asignado puede operar pedidos contra entrega.',
      );
    }

    const updatedOrder = await this.prisma.$transaction(
      async (tx) => {
        const order = await this.getSellerManagedOrderForUpdate(
          tx,
          currentUser,
          orderId,
          input.allowedFrom,
        );

        return this.updateOrderLifecycle(
          tx,
          order,
          currentUser,
          {
            nextOrderStatus: input.nextOrderStatus,
            nextPaymentStatus: input.nextPaymentStatus,
            activity: input.activity,
            note: input.note,
            metadata: input.metadata,
            restoreStock: input.restoreStock,
            extraData: input.extraData,
          },
          auditContext,
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return this.mapOrder(updatedOrder, currentUser);
  }

  private async updateOrderLifecycle(
    tx: Prisma.TransactionClient,
    order: OrderWithRelations,
    currentUser: AuthenticatedUser,
    input: LifecycleUpdateInput,
    auditContext?: AuditRequestContext,
  ) {
    const now = new Date();
    let nextOrderStatus = input.nextOrderStatus;
    const nextPaymentStatus = input.nextPaymentStatus;
    const baseExtraData = {
      ...(input.extraData || {}),
    } as Prisma.OrderUpdateInput;

    if (input.restoreStock) {
      await this.restoreReservedStock(tx, order);
    }

    if (
      nextPaymentStatus === PaymentStatus.PAID &&
      (nextOrderStatus === OrderFlowStatus.ENTREGADO || order.deliveredAt)
    ) {
      nextOrderStatus = OrderFlowStatus.COMPLETADO;
      baseExtraData.completedAt = order.completedAt || now;
    }

    if (
      nextOrderStatus === OrderFlowStatus.ENTREGADO &&
      nextPaymentStatus === PaymentStatus.PAID
    ) {
      nextOrderStatus = OrderFlowStatus.COMPLETADO;
      baseExtraData.completedAt = order.completedAt || now;
    }

    if (nextOrderStatus === OrderFlowStatus.COMPLETADO) {
      baseExtraData.completedAt = order.completedAt || now;
    }

    if (nextOrderStatus === OrderFlowStatus.CANCELADO) {
      baseExtraData.cancelledAt = order.cancelledAt || now;
    }

    if (nextOrderStatus === OrderFlowStatus.RECHAZADO) {
      baseExtraData.rejectedAt = order.rejectedAt || now;
    }

    if (nextOrderStatus === OrderFlowStatus.PAGADO || nextPaymentStatus === PaymentStatus.PAID) {
      baseExtraData.paidAt = order.paidAt || now;
    }

    const updatedOrder = await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        orderStatus: nextOrderStatus,
        paymentStatus: nextPaymentStatus,
        status: this.mapLegacyStatus(
          nextOrderStatus,
          nextPaymentStatus,
          order.paymentMethod,
        ),
        ...baseExtraData,
      },
      include: ORDER_INCLUDE,
    });

    if (order.orderStatus !== updatedOrder.orderStatus) {
      await this.appendStatusHistory(tx, {
        orderId: order.id,
        fromStatus: order.orderStatus,
        toStatus: updatedOrder.orderStatus,
        currentUser,
        note: input.note,
        metadata: input.metadata,
      });
    }

    await this.auditService.createEntry({
      tx,
      userId: currentUser.userId,
      usuario: currentUser.email,
      actividad: input.activity,
      context: auditContext,
      detalle: {
        pedidoId: order.id,
        orderStatusAnterior: this.mapOrderStatus(order.orderStatus),
        orderStatusNuevo: this.mapOrderStatus(updatedOrder.orderStatus),
        paymentStatusAnterior: this.mapPaymentStatus(order.paymentStatus),
        paymentStatusNuevo: this.mapPaymentStatus(updatedOrder.paymentStatus),
        note: input.note,
        restoreStock: Boolean(input.restoreStock),
        metadata: input.metadata || null,
      },
    });

    return updatedOrder;
  }

  private async appendStatusHistory(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      fromStatus: OrderFlowStatus | null;
      toStatus: OrderFlowStatus;
      currentUser: AuthenticatedUser;
      note: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await tx.orderStatusHistory.create({
      data: {
        orderId: input.orderId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        changedByUserId: input.currentUser.userId,
        changedByRole: input.currentUser.role,
        note: input.note,
        metadata: input.metadata,
      },
    });
  }

  private async getAccessibleOrder(currentUser: AuthenticatedUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    this.assertOrderAccess(currentUser, order);

    return order;
  }

  private async getSellerManagedOrderForUpdate(
    tx: Prisma.TransactionClient,
    currentUser: AuthenticatedUser,
    id: string,
    allowedFrom: OrderFlowStatus[],
  ) {
    const order = await tx.order.findUnique({
      where: {
        id,
      },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    if (order.paymentMethod !== CASH_ON_DELIVERY_PAYMENT_METHOD) {
      throw new BadRequestException(
        'La operacion solicitada solo aplica para pedidos contra entrega.',
      );
    }

    if (order.assignedSellerId !== currentUser.userId) {
      throw new ForbiddenException(
        'No puedes operar un pedido asignado a otro vendedor.',
      );
    }

    if (!allowedFrom.includes(order.orderStatus)) {
      throw new BadRequestException(
        `No puedes cambiar el pedido desde el estado ${this.mapOrderStatus(
          order.orderStatus,
        )}.`,
      );
    }

    if (COD_FINAL_STATUSES.includes(order.orderStatus as (typeof COD_FINAL_STATUSES)[number])) {
      throw new BadRequestException(
        'No puedes modificar un pedido finalizado, cancelado o rechazado.',
      );
    }

    return order;
  }

  private assertOrderAccess(currentUser: AuthenticatedUser, order: OrderWithRelations) {
    if (isAdminRole(currentUser.role)) {
      return;
    }

    if (currentUser.role === 'seller') {
      if (order.assignedSellerId !== currentUser.userId) {
        throw new ForbiddenException('No puedes consultar este pedido.');
      }

      return;
    }

    if (order.userId !== currentUser.userId) {
      throw new ForbiddenException('No puedes consultar este pedido.');
    }
  }

  private async loadNormalizedItems(
    tx: Prisma.TransactionClient,
    items: CreateOrderDto['items'],
  ) {
    const productIds = items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        seller: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o mas productos no existen.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    return items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException('Producto no encontrado.');
      }

      if (product.deletedAt || !product.isActive) {
        throw new BadRequestException(
          `El producto ${product.name} ya no esta disponible para la venta.`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `No hay stock suficiente de ${product.name}.`,
        );
      }

      return {
        product,
        quantity: item.quantity,
        unitPrice: this.getUnitPrice(product),
      } satisfies NormalizedOrderItem;
    });
  }

  private calculateTotals(items: NormalizedOrderItem[], vatRate: number) {
    const subtotal = roundMoney(
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    );
    const tax = roundMoney(subtotal * vatRate);
    const total = roundMoney(subtotal + tax);

    return {
      subtotal,
      tax,
      total,
    };
  }

  private resolveAssignedSellerId(
    items: NormalizedOrderItem[],
    paymentMethod: SupportedPaymentMethod,
  ) {
    const sellerIds = [...new Set(items.map((item) => item.product.sellerId))];

    if (
      paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
      sellerIds.length !== 1
    ) {
      throw new BadRequestException(
        'Los pedidos contra entrega solo pueden incluir productos de un mismo vendedor.',
      );
    }

    return sellerIds.length === 1 ? sellerIds[0] : null;
  }

  private async decrementReservedStock(
    tx: Prisma.TransactionClient,
    items: NormalizedOrderItem[],
  ) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.product.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }
  }

  private async restoreReservedStock(
    tx: Prisma.TransactionClient,
    order: OrderWithRelations,
  ) {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }
  }

  private async syncCustomerPhoneNumber(
    tx: Prisma.TransactionClient,
    userId: string,
    currentPhoneNumber: string | null,
    nextPhoneNumber: string | null,
  ) {
    if (!nextPhoneNumber || currentPhoneNumber === nextPhoneNumber) {
      return;
    }

    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        phoneNumber: nextPhoneNumber,
      },
    });
  }

  private buildPayphoneOrderPayload(
    order: OrderWithRelations,
    phoneNumber: string,
    auditContext?: AuditRequestContext,
  ) {
    const shippingAddress =
      order.shippingAddress && typeof order.shippingAddress === 'object'
        ? (order.shippingAddress as Record<string, unknown>)
        : {};
    const city = this.readString(shippingAddress.city) || 'Quito';
    const address = this.readString(shippingAddress.address) || 'Sin direccion';
    const note = this.readString(shippingAddress.note);

    return {
      billTo: {
        billToId: 1,
        address1: address,
        address2: note || city,
        country: 'EC',
        state: city,
        locality: city,
        firstName: order.user.firstName,
        lastName: order.user.lastName,
        phoneNumber: this.formatPhoneForBillTo(phoneNumber),
        email: order.user.email,
        postalCode: 'EC000000',
        customerId: order.user.id,
        ipAddress: auditContext?.ipAddress || '127.0.0.1',
      },
      lineItems: this.buildPayphoneLineItems(order.items, Number(order.tax)),
    };
  }

  private buildPayphoneLineItems(
    items: OrderWithRelations['items'],
    totalTax: number,
  ) {
    const totalTaxCents = toCents(totalTax);
    const totalSubtotalCents = items.reduce(
      (sum, item) => sum + toCents(Number(item.unitPrice)) * item.quantity,
      0,
    );
    let assignedTaxCents = 0;

    return items.map((item, index) => {
      const unitPriceCents = toCents(Number(item.unitPrice));
      const lineSubtotalCents = unitPriceCents * item.quantity;
      const isLastLine = index === items.length - 1;
      const lineTaxCents = isLastLine
        ? totalTaxCents - assignedTaxCents
        : totalSubtotalCents > 0
          ? Math.round((lineSubtotalCents / totalSubtotalCents) * totalTaxCents)
          : 0;

      assignedTaxCents += lineTaxCents;

      return {
        productName: item.productName,
        unitPrice: unitPriceCents,
        quantity: item.quantity,
        totalAmount: lineSubtotalCents + lineTaxCents,
        taxAmount: lineTaxCents,
        productSKU: item.product.sku,
        productDescription: item.product.description,
      };
    });
  }

  private normalizePaymentMethod(paymentMethod: string): SupportedPaymentMethod {
    const normalized = paymentMethod
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');

    if (
      normalized === PAYPHONE_PAYMENT_METHOD ||
      normalized === 'tarjeta' ||
      normalized === 'tarjeta_payphone' ||
      normalized === 'tarjeta_simulada'
    ) {
      return PAYPHONE_PAYMENT_METHOD;
    }

    if (
      normalized === CASH_ON_DELIVERY_PAYMENT_METHOD ||
      normalized === 'contraentrega'
    ) {
      return CASH_ON_DELIVERY_PAYMENT_METHOD;
    }

    throw new BadRequestException('Metodo de pago no soportado.');
  }

  private resolveCountryCode(countryCode?: string) {
    return (
      countryCode?.trim() || PAYPHONE_DEFAULT_COUNTRY_CODE
    ).replace(/\D/g, '');
  }

  private resolveCustomerPhoneNumber(phoneNumber?: string) {
    if (!phoneNumber?.trim()) {
      throw new BadRequestException(
        'El telefono del cliente es obligatorio para pagar con PayPhone.',
      );
    }

    return this.payphoneService.normalizePhoneNumber(phoneNumber);
  }

  private resolveContactPhoneNumber(phoneNumber?: string) {
    return phoneNumber?.trim() || null;
  }

  private generateDeliveryOtp() {
    const minValue = 10 ** (COD_DELIVERY_OTP_LENGTH - 1);
    const maxValue = 10 ** COD_DELIVERY_OTP_LENGTH - 1;

    return `${Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue}`;
  }

  private buildClientTransactionId(userId: string) {
    const now = new Date();
    const compactDate = [
      now.getFullYear(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
    const compactTime = [
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join('');
    const userFragment =
      userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'USER';
    const entropy = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `${compactDate}-${compactTime}-${userFragment}-${entropy}`;
  }

  private formatPhoneForBillTo(phoneNumber: string) {
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
      return `+593${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.startsWith('593')) {
      return `+${digitsOnly}`;
    }

    return phoneNumber;
  }

  private resolvePayphoneLifecycle(
    response: PayphoneTransactionResponse,
    order: OrderWithRelations,
  ) {
    const statusCode = this.readNumber(response.statusCode);
    const transactionStatus = this.readString(response.transactionStatus)
      .toLowerCase()
      .trim();
    const messageCode = this.readNumber(response.messageCode);

    if (statusCode === 3 || transactionStatus === 'approved') {
      if (order.orderStatus === OrderFlowStatus.COMPLETADO) {
        return {
          orderStatus: order.orderStatus,
          paymentStatus: PaymentStatus.PAID,
          paidAt: order.paidAt || new Date(),
          completedAt: order.completedAt || new Date(),
        };
      }

      return {
        orderStatus: OrderFlowStatus.COMPLETADO,
        paymentStatus: PaymentStatus.PAID,
        paidAt: order.paidAt || new Date(),
        completedAt: order.completedAt || new Date(),
      };
    }

    if (
      statusCode === 2 ||
      transactionStatus === 'canceled' ||
      transactionStatus === 'cancelled'
    ) {
      return {
        orderStatus: this.isOrderFinal(order.orderStatus)
          ? order.orderStatus
          : OrderFlowStatus.CANCELADO,
        paymentStatus: PaymentStatus.CANCELED,
        cancelledAt: order.cancelledAt || new Date(),
      };
    }

    if (
      transactionStatus === 'failed' ||
      transactionStatus === 'rejected' ||
      transactionStatus === 'denied' ||
      transactionStatus === 'error' ||
      (statusCode !== null && statusCode !== 1 && statusCode !== 2 && statusCode !== 3) ||
      (messageCode !== null && messageCode !== 0)
    ) {
      return {
        orderStatus: this.isOrderFinal(order.orderStatus)
          ? order.orderStatus
          : OrderFlowStatus.CANCELADO,
        paymentStatus: PaymentStatus.FAILED,
        cancelledAt: order.cancelledAt || new Date(),
      };
    }

    return {
      orderStatus: order.orderStatus === OrderFlowStatus.COMPLETADO
        ? OrderFlowStatus.COMPLETADO
        : OrderFlowStatus.PENDIENTE,
      paymentStatus: order.paymentStatus === PaymentStatus.PAID
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
    };
  }

  private buildPayphoneTransitionNote(nextOrderStatus: OrderFlowStatus) {
    switch (nextOrderStatus) {
      case OrderFlowStatus.COMPLETADO:
        return 'PayPhone confirmo el cobro y el pedido se completo automaticamente.';
      case OrderFlowStatus.CANCELADO:
        return 'PayPhone informo que el pedido fue cancelado o no aprobado.';
      default:
        return 'PayPhone mantiene el pedido en espera de aprobacion.';
    }
  }

  private mapLegacyStatus(
    orderStatus: OrderFlowStatus,
    paymentStatus: PaymentStatus,
    paymentMethod: string,
  ): LegacyOrderStatus {
    if (paymentMethod === PAYPHONE_PAYMENT_METHOD) {
      if (paymentStatus === PaymentStatus.PAID) {
        return LegacyOrderStatus.PAYMENT_APPROVED;
      }

      if (paymentStatus === PaymentStatus.CANCELED) {
        return LegacyOrderStatus.PAYMENT_CANCELED;
      }

      if (paymentStatus === PaymentStatus.FAILED) {
        return LegacyOrderStatus.PAYMENT_FAILED;
      }

      return LegacyOrderStatus.PENDING_PAYMENT;
    }

    if (
      orderStatus === OrderFlowStatus.CANCELADO ||
      orderStatus === OrderFlowStatus.RECHAZADO
    ) {
      return LegacyOrderStatus.CANCELLED;
    }

    if (
      orderStatus === OrderFlowStatus.PAGADO ||
      orderStatus === OrderFlowStatus.COMPLETADO
    ) {
      return LegacyOrderStatus.PAID;
    }

    return LegacyOrderStatus.CONFIRMED;
  }

  private createSaleRecord(item: SalesOrderItem) {
    const sellerName = `${item.seller.firstName} ${item.seller.lastName}`.trim();

    return {
      id: `${item.orderId}:${item.sellerId}`,
      orderId: item.orderId,
      createdAt: item.order.createdAt,
      updatedAt: item.order.updatedAt,
      status: this.mapOrderStatus(item.order.orderStatus),
      orderStatus: this.mapOrderStatus(item.order.orderStatus),
      paymentStatus: this.mapPaymentStatus(item.order.paymentStatus),
      paymentMethod: item.order.paymentMethod,
      shippingAddress: item.order.shippingAddress,
      customer: {
        id: item.order.user.id,
        fullName: `${item.order.user.firstName} ${item.order.user.lastName}`.trim(),
        email: item.order.user.email,
        role: mapPrismaRole(item.order.user.role),
      },
      seller: {
        id: item.seller.id,
        fullName: sellerName,
        username: item.seller.username,
        email: item.seller.email,
        rating: Number(item.seller.sellerRating),
        ratedProductsCount: item.seller.sellerRatedProductsCount,
      },
      sellerCustomerRating: item.order.sellerCustomerRating,
      subtotal: 0,
      tax: 0,
      total: 0,
      totalUnits: 0,
      _orderSubtotal: Number(item.order.subtotal),
      _orderTax: Number(item.order.tax),
      items: [] as Array<{
        id: number;
        productId: string;
        sellerId: string;
        sellerName: string;
        name: string;
        category: string;
        imageUrl: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        customerRating: number | null;
        ratedAt: Date | null;
        currentStock: number;
      }>,
    };
  }

  private async getCurrentVatConfig(
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const company = (await tx.empresa.findUnique({
      where: {
        singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
      },
    })) as CompanyVatSelection | null;

    if (!company) {
      return {
        vatRate: DEFAULT_COMPANY_CONFIG.vatRate,
        vatPercent: DEFAULT_COMPANY_CONFIG.vatPercent,
      };
    }

    return {
      vatRate: Number(company.vatRate),
      vatPercent: company.vatPercent,
    };
  }

  private getUnitPrice(product: Product) {
    const price = Number(product.price);

    if (!product.isPromotion || product.promotionDiscount <= 0) {
      return roundMoney(price);
    }

    return roundMoney(price * (1 - product.promotionDiscount / 100));
  }

  private canCustomerRateSeller(order: OrderWithRelations, viewer: OrderViewer) {
    return (
      viewer?.role === 'customer' &&
      viewer.userId === order.userId &&
      order.orderStatus === OrderFlowStatus.COMPLETADO &&
      order.paymentStatus === PaymentStatus.PAID &&
      !order.customerRatedAt
    );
  }

  private canSellerRateCustomer(order: OrderWithRelations, viewer: OrderViewer) {
    return (
      viewer?.role === 'seller' &&
      viewer.userId === order.assignedSellerId &&
      order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
      order.orderStatus === OrderFlowStatus.COMPLETADO &&
      order.paymentStatus === PaymentStatus.PAID &&
      !order.sellerCustomerRatedAt
    );
  }

  private isOrderCompleted(orderStatus: OrderFlowStatus) {
    return orderStatus === OrderFlowStatus.COMPLETADO;
  }

  private isOrderFinal(orderStatus: OrderFlowStatus) {
    return COD_FINAL_STATUSES.includes(orderStatus as (typeof COD_FINAL_STATUSES)[number]);
  }

  private getVisibleDeliveryOtp(order: OrderWithRelations, viewer: OrderViewer) {
    if (!order.deliveryOtp) {
      return null;
    }

    if (!OTP_VISIBLE_STATUSES.has(order.orderStatus)) {
      return null;
    }

    if (isAdminRole(viewer?.role || null)) {
      return order.deliveryOtp;
    }

    if (viewer?.userId === order.userId) {
      return order.deliveryOtp;
    }

    return null;
  }

  private buildSellerActions(order: OrderWithRelations, viewer: OrderViewer) {
    if (viewer?.role !== 'seller' || viewer.userId !== order.assignedSellerId) {
      return {
        canAccept: false,
        canReject: false,
        canPrepare: false,
        canDispatch: false,
        canConfirmDelivery: false,
        canConfirmPayment: false,
        canRateCustomer: false,
      };
    }

    return {
      canAccept:
        order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
        order.orderStatus === OrderFlowStatus.PENDIENTE,
      canReject:
        order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
        order.orderStatus === OrderFlowStatus.PENDIENTE,
      canPrepare:
        order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
        order.orderStatus === OrderFlowStatus.CONFIRMADO,
      canDispatch:
        order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
        new Set<OrderFlowStatus>([
          OrderFlowStatus.CONFIRMADO,
          OrderFlowStatus.EN_PREPARACION,
        ]).has(order.orderStatus),
      canConfirmDelivery:
        order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
        new Set<OrderFlowStatus>([
          OrderFlowStatus.EN_CAMINO,
          OrderFlowStatus.PAGADO,
        ]).has(order.orderStatus),
      canConfirmPayment:
        order.paymentMethod === CASH_ON_DELIVERY_PAYMENT_METHOD &&
        order.paymentStatus !== PaymentStatus.PAID &&
        new Set<OrderFlowStatus>([
          OrderFlowStatus.EN_CAMINO,
          OrderFlowStatus.ENTREGADO,
        ]).has(order.orderStatus),
      canRateCustomer: this.canSellerRateCustomer(order, viewer),
    };
  }

  private mapOrder(order: OrderWithRelations, viewer: OrderViewer) {
    const customerCanRateSeller = this.canCustomerRateSeller(order, viewer);
    const sellerCanRateCustomer = this.canSellerRateCustomer(order, viewer);
    const visibleOtp = this.getVisibleDeliveryOtp(order, viewer);

    return {
      id: order.id,
      user: this.mapCustomerUser(order.user),
      assignedSeller: this.mapSellerUser(order.assignedSeller),
      status: this.mapOrderStatus(order.orderStatus),
      orderStatus: this.mapOrderStatus(order.orderStatus),
      paymentStatus: this.mapPaymentStatus(order.paymentStatus),
      paymentMethod: order.paymentMethod,
      paymentProvider: order.paymentProvider,
      ratingEligible: customerCanRateSeller,
      hasPendingRatings: customerCanRateSeller,
      customerCanRateSeller,
      sellerCanRateCustomer,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      shippingAddress: order.shippingAddress,
      customerPhoneNumber: order.customerPhoneNumber,
      customerCountryCode: order.customerCountryCode,
      paymentExpiresAt: order.paymentExpiresAt,
      paymentApprovedAt: order.paymentApprovedAt,
      confirmedAt: order.confirmedAt,
      preparingAt: order.preparingAt,
      inTransitAt: order.inTransitAt,
      deliveredAt: order.deliveredAt,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      rejectedAt: order.rejectedAt,
      customerRatedAt: order.customerRatedAt,
      sellerCustomerRating: order.sellerCustomerRating,
      sellerCustomerRatedAt: order.sellerCustomerRatedAt,
      deliveryOtp: visibleOtp,
      hasVisibleDeliveryOtp: Boolean(visibleOtp),
      payphoneClientTransactionId: order.payphoneClientTransactionId,
      payphoneTransactionId: order.payphoneTransactionId,
      payphoneTransactionStatus: order.payphoneTransactionStatus,
      payphoneStatusCode: order.payphoneStatusCode,
      payphoneAuthorizationCode: order.payphoneAuthorizationCode,
      payphoneMessage: order.payphoneMessage,
      payphoneMessageCode: order.payphoneMessageCode,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      timeline: order.statusHistory.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus
          ? this.mapOrderStatus(event.fromStatus)
          : null,
        toStatus: this.mapOrderStatus(event.toStatus),
        changedBy: {
          id: event.changedByUser.id,
          fullName: `${event.changedByUser.firstName} ${event.changedByUser.lastName}`.trim(),
          email: event.changedByUser.email,
          role: mapPrismaRole(event.changedByUser.role),
        },
        changedByRole: event.changedByRole,
        note: event.note,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
      actions: {
        customerCanRateSeller,
        sellerCanRateCustomer,
        payphoneCanRefresh:
          order.paymentProvider === PAYPHONE_PROVIDER &&
          order.paymentStatus === PaymentStatus.PENDING,
        ...this.buildSellerActions(order, viewer),
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerRating: Number(item.seller.sellerRating),
        name: item.productName,
        category: item.productCategory,
        imageUrl:
          item.productThumbUrl ||
          item.productImageUrl ||
          item.product.imageThumbUrl ||
          item.product.imageSecureUrl ||
          item.product.imageUrl ||
          '',
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        customerRating: item.customerRating,
        ratedAt: item.ratedAt,
        currentStock: item.product.stock,
      })),
    };
  }

  private mapCustomerUser(user: UserWithMetrics | null) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: mapPrismaRole(user.role),
      customerRating: Number(user.customerRating),
      customerRatedOrdersCount: user.customerRatedOrdersCount,
    };
  }

  private mapSellerUser(user: UserWithMetrics | null) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: mapPrismaRole(user.role),
      rating: Number(user.sellerRating),
      ratedProductsCount: user.sellerRatedProductsCount,
    };
  }

  private mapOrderStatus(status: OrderFlowStatus) {
    return status.toLowerCase();
  }

  private mapPaymentStatus(status: PaymentStatus) {
    return status.toLowerCase();
  }

  private readString(value: unknown) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return '';
  }

  private readNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const normalized = Number(value);
      return Number.isFinite(normalized) ? normalized : null;
    }

    return null;
  }

  private sanitizeJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No se pudo completar la operacion con PayPhone.';
  }

  private isHandledPayphoneError(error: unknown): error is PayphoneHandledError {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'payphoneHandled' in error &&
        (error as PayphoneHandledError).payphoneHandled,
    );
  }
}
