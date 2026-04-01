import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'admin') {
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
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
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

  async create(currentUser: AuthenticatedUser, payload: CreateUserDto) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Solo un administrador puede crear usuarios.');
    }

    const email = payload.email.trim().toLowerCase();
    const username = payload.username.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
      select: {
        email: true,
        username: true,
      },
    });

    if (existingUser?.email === email) {
      throw new BadRequestException('El correo ya existe.');
    }

    if (existingUser?.username === username) {
      throw new BadRequestException('El nombre de usuario ya existe.');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        username,
        email,
        passwordHash: await hash(payload.password, 10),
        role: payload.role === 'admin' ? Role.ADMIN : Role.CUSTOMER,
      },
    });

    return this.mapUser(user);
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      username: user.username,
      email: user.email,
      role: user.role === Role.ADMIN ? 'admin' : 'customer',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
