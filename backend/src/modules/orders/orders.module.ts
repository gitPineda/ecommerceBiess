import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PayphoneModule } from '../payphone/payphone.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, PayphoneModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
