import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RequestLike } from '../audit/interfaces/audit-request-context.interface';
import { buildAuditRequestContext } from '../audit/utils/build-audit-request-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get()
  listPublic() {
    return this.productCategoriesService.listPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('managed')
  listManaged(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.productCategoriesService.listManaged(currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(
    @Body() payload: CreateProductCategoryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.productCategoriesService.create(
      payload,
      currentUser,
      buildAuditRequestContext(request),
    );
  }
}
