import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequestLike } from '../audit/interfaces/audit-request-context.interface';
import { buildAuditRequestContext } from '../audit/utils/build-audit-request-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsDto) {
    return this.productsService.list(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seller')
  @Get('managed')
  listManaged(
    @Query() query: ListProductsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.productsService.listManaged(query, currentUser);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seller')
  @Post()
  create(
    @Body() payload: CreateProductDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.productsService.create(
      payload,
      currentUser,
      buildAuditRequestContext(request),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seller')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateProductDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.productsService.update(
      id,
      payload,
      currentUser,
      buildAuditRequestContext(request),
    );
  }
}
