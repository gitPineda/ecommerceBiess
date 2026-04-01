import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.ordersService.list(currentUser);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ordersService.getById(currentUser, id);
  }

  @Post()
  create(
    @Body() payload: CreateOrderDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ordersService.create(currentUser, payload);
  }
}
