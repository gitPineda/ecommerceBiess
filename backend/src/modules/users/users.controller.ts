import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.list(currentUser);
  }

  @Get('me')
  getCurrentUser(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.getCurrentUser(currentUser);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.getById(currentUser, id);
  }

  @Post()
  @Roles('admin')
  create(
    @Body() payload: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.create(currentUser, payload);
  }
}
