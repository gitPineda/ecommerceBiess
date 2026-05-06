import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import {
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_COMPANY_SINGLETON_KEY,
} from '../../config/default-company';
import { AuditService } from '../audit/audit.service';
import { AuditRequestContext } from '../audit/interfaces/audit-request-context.interface';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapAppRoleToPrisma, mapPrismaRole } from './auth-role.utils';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type UserWithMetrics = User & {
  sellerRating: number | { toString(): string };
  sellerStarsTotal: number;
  sellerRatedProductsCount: number;
  customerRating: number | { toString(): string };
  customerStarsTotal: number;
  customerRatedOrdersCount: number;
};

type PasswordResetTokenPayload = {
  sub: string;
  email: string;
  requestId: string;
  purpose: 'password_reset';
};

type CompanyBrandingSelection = {
  appName: string;
  supportEmail: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async register(payload: RegisterDto, auditContext?: AuditRequestContext) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const normalizedUsername = payload.username.trim().toLowerCase();
    const existingUsers = await this.prisma.user.findMany({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
      select: {
        email: true,
        username: true,
        role: true,
      },
    });

    const sameRoleUser = existingUsers.find((user) => user.role === payload.role);

    if (sameRoleUser?.email === normalizedEmail) {
      throw new BadRequestException(
        'Ya existe un usuario con ese correo y el mismo rol.',
      );
    }

    if (sameRoleUser?.username === normalizedUsername) {
      throw new BadRequestException(
        'Ya existe un usuario con ese nombre de usuario y el mismo rol.',
      );
    }

    if (existingUsers.some((user) => user.email === normalizedEmail)) {
      throw new BadRequestException('El correo ya esta registrado en otro rol.');
    }

    if (existingUsers.some((user) => user.username === normalizedUsername)) {
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

    const passwordHash = await hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        phoneNumber: payload.phoneNumber?.trim() || null,
        passwordHash,
        role: mapAppRoleToPrisma(payload.role),
      },
    });

    await this.auditService.createEntry({
      userId: user.id,
      usuario: user.email,
      actividad: 'USUARIO_CREADO',
      context: auditContext,
      detalle: {
        origen: 'registro_publico',
        usuarioCreado: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: mapPrismaRole(user.role),
        },
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(payload: LoginDto, auditContext?: AuditRequestContext) {
    const normalizedIdentifier = payload.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const isPasswordValid = await compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    await this.auditService.createEntry({
      userId: user.id,
      usuario: user.email,
      actividad: 'INGRESO_APLICATIVO',
      context: auditContext,
      detalle: {
        identificador: normalizedIdentifier,
        role: mapPrismaRole(user.role),
      },
    });

    return this.buildAuthResponse(user);
  }

  async forgotPassword(
    payload: ForgotPasswordDto,
    auditContext?: AuditRequestContext,
  ) {
    const email = this.normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message:
          'Si el correo existe, hemos enviado un codigo de recuperacion a tu bandeja.',
      };
    }

    const company = await this.getCompanyBranding();
    const code = this.generateResetCode();
    const codeHash = this.signPasswordResetCode(code);
    const expiresAt = this.buildCodeExpiryDate();

    await this.prisma.passwordResetRequest.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const resetRequest = await this.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        emailSnapshot: email,
        codeHash,
        expiresAt,
        maxAttempts: this.getMaxResetAttempts(),
        requestedFromIp: auditContext?.ipAddress || null,
        requestedFromDevice: auditContext?.deviceInfo || null,
      },
    });

    try {
      await this.mailService.sendPasswordResetCodeEmail({
        fromEmail: company.supportEmail,
        appName: company.appName,
        toEmail: user.email,
        recipientName: `${user.firstName} ${user.lastName}`.trim() || user.username,
        code,
        expiresInMinutes: this.getPasswordResetCodeTtlMinutes(),
      });
    } catch (error) {
      await this.prisma.passwordResetRequest.delete({
        where: {
          id: resetRequest.id,
        },
      });
      throw error;
    }

    await this.auditService.createEntry({
      userId: user.id,
      usuario: user.email,
      actividad: 'RECUPERACION_CLAVE_SOLICITADA',
      context: auditContext,
      detalle: {
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      message:
        'Si el correo existe, hemos enviado un codigo de recuperacion a tu bandeja.',
      email,
    };
  }

  async verifyForgotPasswordCode(
    payload: VerifyPasswordResetCodeDto,
    auditContext?: AuditRequestContext,
  ) {
    const email = this.normalizeEmail(payload.email);
    const code = this.normalizeResetCode(payload.code);
    const resetRequest = await this.getLatestActivePasswordResetRequest(email);

    if (!resetRequest || this.isExpired(resetRequest.expiresAt)) {
      throw new BadRequestException('El codigo no es valido o ya expiro.');
    }

    if (resetRequest.usedAt) {
      throw new BadRequestException('El codigo no es valido o ya expiro.');
    }

    if (resetRequest.attempts >= resetRequest.maxAttempts) {
      await this.prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          usedAt: resetRequest.usedAt || new Date(),
        },
      });
      throw new BadRequestException('El codigo no es valido o ya expiro.');
    }

    if (!this.matchesPasswordResetCode(code, resetRequest.codeHash)) {
      const nextAttempts = resetRequest.attempts + 1;
      await this.prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          attempts: nextAttempts,
          usedAt:
            nextAttempts >= resetRequest.maxAttempts ? new Date() : resetRequest.usedAt,
        },
      });

      await this.auditService.createEntry({
        userId: resetRequest.user.id,
        usuario: resetRequest.user.email,
        actividad: 'RECUPERACION_CLAVE_VERIFICACION_FALLIDA',
        context: auditContext,
        detalle: {
          email,
          attempts: nextAttempts,
        },
      });

      throw new BadRequestException('El codigo no es valido o ya expiro.');
    }

    const verifiedAt = new Date();
    await this.prisma.passwordResetRequest.update({
      where: { id: resetRequest.id },
      data: {
        verifiedAt,
      },
    });

    await this.auditService.createEntry({
      userId: resetRequest.user.id,
      usuario: resetRequest.user.email,
      actividad: 'RECUPERACION_CLAVE_CODIGO_VERIFICADO',
      context: auditContext,
      detalle: {
        email,
      },
    });

    const resetToken = await this.jwtService.signAsync(
      {
        sub: resetRequest.user.id,
        email: resetRequest.user.email,
        requestId: resetRequest.id,
        purpose: 'password_reset',
      } satisfies PasswordResetTokenPayload,
      {
        secret: this.buildPasswordResetSecret(),
        expiresIn: `${this.getPasswordResetCodeTtlMinutes()}m` as never,
      },
    );

    return {
      message: 'Codigo validado correctamente.',
      resetToken,
      email,
    };
  }

  async resetForgottenPassword(
    payload: ResetPasswordDto,
    auditContext?: AuditRequestContext,
  ) {
    let tokenPayload: PasswordResetTokenPayload;

    try {
      tokenPayload = await this.jwtService.verifyAsync<PasswordResetTokenPayload>(
        payload.resetToken,
        {
          secret: this.buildPasswordResetSecret(),
        },
      );
    } catch {
      throw new BadRequestException('La sesion de recuperacion ya no es valida.');
    }

    if (tokenPayload.purpose !== 'password_reset') {
      throw new BadRequestException('La sesion de recuperacion ya no es valida.');
    }

    const resetRequest = await this.prisma.passwordResetRequest.findUnique({
      where: { id: tokenPayload.requestId },
      include: {
        user: true,
      },
    });

    if (
      !resetRequest ||
      resetRequest.userId !== tokenPayload.sub ||
      resetRequest.user.email !== tokenPayload.email ||
      !resetRequest.verifiedAt ||
      resetRequest.usedAt ||
      this.isExpired(resetRequest.expiresAt)
    ) {
      throw new BadRequestException('La sesion de recuperacion ya no es valida.');
    }

    const normalizedPassword = payload.newPassword.trim();
    const isSamePassword = await compare(
      normalizedPassword,
      resetRequest.user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva clave debe ser diferente a la clave actual.',
      );
    }

    const passwordHash = await hash(normalizedPassword, 10);
    const usedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRequest.user.id },
        data: {
          passwordHash,
        },
      });

      await tx.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          usedAt,
        },
      });

      await tx.passwordResetRequest.updateMany({
        where: {
          userId: resetRequest.user.id,
          usedAt: null,
          id: {
            not: resetRequest.id,
          },
        },
        data: {
          usedAt,
        },
      });
    });

    await this.auditService.createEntry({
      userId: resetRequest.user.id,
      usuario: resetRequest.user.email,
      actividad: 'CLAVE_RESTABLECIDA',
      context: auditContext,
      detalle: {
        email: resetRequest.user.email,
      },
    });

    return {
      message: 'Tu clave fue restablecida correctamente.',
    };
  }

  private async buildAuthResponse(user: User) {
    const metricAwareUser = user as UserWithMetrics;
    const role = mapPrismaRole(user.role);
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
        phoneNumber: user.phoneNumber,
        role,
        sellerRating: Number(metricAwareUser.sellerRating),
        sellerStarsTotal: metricAwareUser.sellerStarsTotal,
        sellerRatedProductsCount: metricAwareUser.sellerRatedProductsCount,
        customerRating: Number(metricAwareUser.customerRating),
        customerStarsTotal: metricAwareUser.customerStarsTotal,
        customerRatedOrdersCount: metricAwareUser.customerRatedOrdersCount,
        createdAt: user.createdAt,
      },
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeResetCode(code: string) {
    return code.replace(/\D/g, '').trim();
  }

  private generateResetCode() {
    return `${randomInt(100000, 1000000)}`;
  }

  private signPasswordResetCode(code: string) {
    return createHmac('sha256', this.buildPasswordResetSecret())
      .update(code)
      .digest('hex');
  }

  private matchesPasswordResetCode(code: string, expectedHash: string) {
    const receivedHash = this.signPasswordResetCode(code);
    return timingSafeEqual(
      Buffer.from(receivedHash, 'utf8'),
      Buffer.from(expectedHash, 'utf8'),
    );
  }

  private buildCodeExpiryDate() {
    return new Date(
      Date.now() + this.getPasswordResetCodeTtlMinutes() * 60 * 1000,
    );
  }

  private getPasswordResetCodeTtlMinutes() {
    const configured = Number(process.env.PASSWORD_RESET_CODE_TTL_MINUTES || '15');
    return Number.isFinite(configured) && configured > 0 ? configured : 15;
  }

  private getMaxResetAttempts() {
    const configured = Number(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '5');
    return Number.isFinite(configured) && configured > 0 ? configured : 5;
  }

  private buildPasswordResetSecret() {
    const baseSecret = process.env.JWT_SECRET || 'change-me-in-production';
    return `${baseSecret}:password-reset`;
  }

  private isExpired(expiresAt: Date) {
    return expiresAt.getTime() <= Date.now();
  }

  private async getLatestActivePasswordResetRequest(email: string) {
    return this.prisma.passwordResetRequest.findFirst({
      where: {
        emailSnapshot: email,
        usedAt: null,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async getCompanyBranding() {
    const company = (await this.prisma.empresa.upsert({
      where: {
        singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
      },
      update: {},
      create: {
        singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
        ...DEFAULT_COMPANY_CONFIG,
      },
      select: {
        appName: true,
        supportEmail: true,
      },
    })) as CompanyBrandingSelection;

    return company;
  }
}
