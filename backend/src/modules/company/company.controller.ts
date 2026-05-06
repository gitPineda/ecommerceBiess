import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { RequestLike } from '../audit/interfaces/audit-request-context.interface';
import { buildAuditRequestContext } from '../audit/utils/build-audit-request-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  getPublicProfile() {
    return this.companyService.getPublicProfile();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put()
  update(
    @Body() payload: UpdateCompanyDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestLike,
  ) {
    return this.companyService.update(
      payload,
      currentUser,
      buildAuditRequestContext(request),
    );
  }
}
