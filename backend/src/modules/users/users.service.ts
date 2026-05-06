import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { AuditRequestContext } from '../audit/interfaces/audit-request-context.interface';
import {
  isAdminRole,
  mapAppRoleToPrisma,
  mapPrismaRole,
} from '../auth/auth-role.utils';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

type UserWithSellerMetrics = User & {
  sellerRating: number | { toString(): string };
  sellerStarsTotal: number;
  sellerRatedProductsCount: number;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(currentUser: AuthenticatedUser) {
    if (!isAdminRole(currentUser.role)) {
      throw new ForbiddenException('Solo un administrador puede listar usuarios.');
    }

    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: users.map((user) => this.mapUser(user)),
      total: users.length,
    };
  }

  async getCurrentUser(currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.mapUser(user);
  }

  async getById(currentUser: AuthenticatedUser, id: string) {
    if (!isAdminRole(currentUser.role) && currentUser.userId !== id) {
      throw new ForbiddenException('No puedes consultar otro usuario.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.mapUser(user);
  }

  async create(
    currentUser: AuthenticatedUser,
    payload: CreateUserDto,
    auditContext?: AuditRequestContext,
  ) {
    if (!isAdminRole(currentUser.role)) {
      throw new ForbiddenException('Solo un administrador puede crear usuarios.');
    }

    const email = payload.email.trim().toLowerCase();
    const username = payload.username.trim().toLowerCase();

    const existingUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
      select: {
        email: true,
        username: true,
        role: true,
      },
    });

    const sameRoleUser = existingUsers.find((user) => user.role === payload.role);

    if (sameRoleUser?.email === email) {
      throw new BadRequestException(
        'Ya existe un usuario con ese correo y el mismo rol.',
      );
    }

    if (sameRoleUser?.username === username) {
      throw new BadRequestException(
        'Ya existe un usuario con ese nombre de usuario y el mismo rol.',
      );
    }

    if (existingUsers.some((user) => user.email === email)) {
      throw new BadRequestException(
        'El correo ya esta registrado en otro rol.',
      );
    }

    if (existingUsers.some((user) => user.username === username)) {
      throw new BadRequestException(
        'El nombre de usuario ya esta registrado en otro rol.',
      );
    }

    const selectedRole = await this.prisma.userRole.findUnique({
      where: { code: payload.role },
      select: { code: true, isActive: true },
    });

    if (!selectedRole || !selectedRole.isActive) {
      throw new BadRequestException('El rol seleccionado no es valido.');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        username,
        email,
        phoneNumber: payload.phoneNumber?.trim() || null,
        passwordHash: await hash(payload.password, 10),
        role: mapAppRoleToPrisma(payload.role),
      },
    });

    await this.auditService.createEntry({
      userId: currentUser.userId,
      usuario: currentUser.email,
      actividad: 'USUARIO_CREADO',
      context: auditContext,
      detalle: {
        origen: 'administracion',
          usuarioCreado: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: mapPrismaRole(user.role),
          },
        },
      });

    return this.mapUser(user);
  }

  private mapUser(user: User) {
    const sellerAwareUser = user as UserWithSellerMetrics;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: mapPrismaRole(user.role),
      sellerRating: Number(sellerAwareUser.sellerRating),
      sellerStarsTotal: sellerAwareUser.sellerStarsTotal,
      sellerRatedProductsCount: sellerAwareUser.sellerRatedProductsCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
