import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedUsername = payload.username.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe una cuenta registrada con ese correo.');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (existingUsername) {
      throw new BadRequestException('El nombre de usuario ya existe.');
    }

    const passwordHash = await hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        role: Role.CUSTOMER,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(payload: LoginDto) {
    const normalizedIdentifier = payload.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const isPasswordValid = await compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    return this.buildAuthResponse(user);
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    await this.prisma.user.findUnique({
      where: { email: payload.email.trim().toLowerCase() },
      select: { id: true },
    });

    return {
      message: 'La solicitud de recuperacion fue recibida.',
      email: payload.email.trim().toLowerCase(),
    };
  }

  private async buildAuthResponse(user: User) {
    const role = this.mapRole(user.role);
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role,
    };
    const accessToken = await this.jwtService.signAsync(jwtPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        username: user.username,
        email: user.email,
        role,
        createdAt: user.createdAt,
      },
    };
  }

  private mapRole(role: Role): 'admin' | 'customer' {
    return role === Role.ADMIN ? 'admin' : 'customer';
  }
}
