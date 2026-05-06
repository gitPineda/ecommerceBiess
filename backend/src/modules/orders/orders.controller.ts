import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RequestLike } from '../audit/interfaces/audit-request-context.interface';
import { buildAuditRequestContext } from '../audit/utils/build-audit-request-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ConfirmDeliveryOtpDto } from './dto/confirm-delivery-otp.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { RateCustomerDto } from './dto/rate-customer.dto';
import { RateOrderDto } from './dto/rate-order.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.ordersService.list(currentUser);
  }

  @Get('sales')
  listSales(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.ordersService.listSales(currentUser);
  }

  @Get('assigned')
  listAssigned(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.ordersService.listAssigned(currentUser);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ordersService.getById(currentUser, id);
  }

  @Get(':id/ratings')
  getRatings(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ordersService.getRatings(currentUser, id);
  }

  @Post(':id/payphone/refresh')
  refreshPayphoneStatus(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.refreshPayphoneStatus(
      currentUser,
      id,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/cod/accept')
  acceptCashOnDeliveryOrder(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.acceptCashOnDeliveryOrder(
      currentUser,
      id,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/cod/reject')
  rejectCashOnDeliveryOrder(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.rejectCashOnDeliveryOrder(
      currentUser,
      id,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/cod/prepare')
  markCashOnDeliveryInPreparation(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.markCashOnDeliveryInPreparation(
      currentUser,
      id,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/cod/dispatch')
  markCashOnDeliveryInTransit(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.markCashOnDeliveryInTransit(
      currentUser,
      id,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/cod/delivery/confirm')
  confirmCashOnDeliveryWithOtp(
    @Param('id') id: string,
    @Body() payload: ConfirmDeliveryOtpDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.confirmCashOnDeliveryWithOtp(
      currentUser,
      id,
      payload,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/cod/payment/confirm')
  confirmCashOnDeliveryPayment(
    @Param('id') id: string,
    @Body() payload: ConfirmPaymentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.confirmCashOnDeliveryPayment(
      currentUser,
      id,
      payload,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/ratings')
  rateOrder(
    @Param('id') id: string,
    @Body() payload: RateOrderDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.rateOrder(
      currentUser,
      id,
      payload,
      buildAuditRequestContext(request),
    );
  }

  @Post(':id/customer-rating')
  rateCustomer(
    @Param('id') id: string,
    @Body() payload: RateCustomerDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.rateCustomer(
      currentUser,
      id,
      payload,
      buildAuditRequestContext(request),
    );
  }

  @Post()
  create(
    @Body() payload: CreateOrderDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.ordersService.create(
      currentUser,
      payload,
      buildAuditRequestContext(request),
    );
  }
}
