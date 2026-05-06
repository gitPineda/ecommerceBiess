import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Empresa, Prisma } from '@prisma/client';
import {
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_COMPANY_SINGLETON_KEY,
} from '../../config/default-company';
import { AuditService } from '../audit/audit.service';
import { AuditRequestContext } from '../audit/interfaces/audit-request-context.interface';
import { isAdminRole } from '../auth/auth-role.utils';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getPublicProfile() {
    const empresa = (await this.ensureCompany()) as EmpresaVatRecord;
    return this.mapCompany(empresa);
  }

  async update(
    payload: UpdateCompanyDto,
    currentUser: AuthenticatedUser,
    auditContext?: AuditRequestContext,
  ) {
    if (!isAdminRole(currentUser.role)) {
      throw new ForbiddenException('Solo el administrador puede actualizar la empresa.');
    }

    const currentCompany = (await this.ensureCompany()) as EmpresaVatRecord;
    const normalizedSlug = payload.slug.trim().toLowerCase();
    const normalizedVatPercent = Number(payload.vatPercent);
    const normalizedVatRate = this.buildVatRate(normalizedVatPercent);

    const slugInUse = await this.prisma.empresa.findFirst({
      where: {
        slug: normalizedSlug,
        id: {
          not: currentCompany.id,
        },
      },
      select: { id: true },
    });

    if (slugInUse) {
      throw new BadRequestException('El slug ya existe para otra empresa.');
    }

    const shouldClearLogo = Boolean(payload.clearLogo);
    const nextLogoData =
      shouldClearLogo || !payload.logoBase64
        ? shouldClearLogo
          ? null
          : currentCompany.logoData
        : Buffer.from(payload.logoBase64, 'base64');

    const nextLogoMimeType =
      shouldClearLogo || !payload.logoBase64
        ? shouldClearLogo
          ? null
          : currentCompany.logoMimeType
        : payload.logoMimeType?.trim() || 'image/jpeg';

    const nextLogoFileName =
      shouldClearLogo || !payload.logoBase64
        ? shouldClearLogo
          ? null
          : currentCompany.logoFileName
        : payload.logoFileName?.trim() || 'logo.jpg';

    const companyUpdateData = {
      appName: payload.appName.trim(),
      shortName: payload.shortName.trim(),
      slug: normalizedSlug,
      tagline: payload.tagline.trim(),
      welcomeTitle: payload.welcomeTitle.trim(),
      welcomeMessage: payload.welcomeMessage.trim(),
      supportEmail: payload.supportEmail.trim().toLowerCase(),
      currency: payload.currency.trim().toUpperCase(),
      currencySymbol: payload.currencySymbol.trim(),
      defaultLocale: payload.defaultLocale.trim(),
      vatRate: normalizedVatRate,
      vatPercent: normalizedVatPercent,
      logoText: payload.logoText.trim(),
      logoMimeType: nextLogoMimeType,
      logoFileName: nextLogoFileName,
      logoData: nextLogoData,
    } as unknown as Prisma.EmpresaUpdateInput;

    const empresa = (await this.prisma.empresa.update({
      where: {
        singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
      },
      data: companyUpdateData,
    })) as EmpresaVatRecord;

    await this.auditService.createEntry({
      userId: currentUser.userId,
      usuario: currentUser.email,
      actividad: 'EMPRESA_ACTUALIZADA',
      context: auditContext,
      detalle: {
        empresa: {
          appName: empresa.appName,
          shortName: empresa.shortName,
          slug: empresa.slug,
          supportEmail: empresa.supportEmail,
          currency: empresa.currency,
          defaultLocale: empresa.defaultLocale,
          vatRate: Number(empresa.vatRate),
          vatPercent: empresa.vatPercent,
          hasLogo: Boolean(empresa.logoData),
        },
      },
    });

    return this.mapCompany(empresa);
  }

  async ensureCompany() {
    return this.prisma.empresa.upsert({
      where: {
        singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
      },
      update: {},
      create: {
        singletonKey: DEFAULT_COMPANY_SINGLETON_KEY,
        ...DEFAULT_COMPANY_CONFIG,
      },
    });
  }

  private mapCompany(empresa: EmpresaVatRecord) {
    return {
      id: empresa.id,
      appName: empresa.appName,
      shortName: empresa.shortName,
      slug: empresa.slug,
      tagline: empresa.tagline,
      welcomeTitle: empresa.welcomeTitle,
      welcomeMessage: empresa.welcomeMessage,
      supportEmail: empresa.supportEmail,
      currency: empresa.currency,
      currencySymbol: empresa.currencySymbol,
      defaultLocale: empresa.defaultLocale,
      vatRate: Number(empresa.vatRate),
      vatPercent: empresa.vatPercent,
      logoText: empresa.logoText,
      logoMimeType: empresa.logoMimeType,
      logoFileName: empresa.logoFileName,
      logoDataUri:
        empresa.logoData && empresa.logoMimeType
          ? `data:${empresa.logoMimeType};base64,${Buffer.from(empresa.logoData).toString('base64')}`
          : null,
      hasCustomLogo: Boolean(empresa.logoData),
      createdAt: empresa.createdAt,
      updatedAt: empresa.updatedAt,
    };
  }

  private buildVatRate(vatPercent: number) {
    return Number((vatPercent / 100).toFixed(4));
  }
}

type EmpresaVatRecord = Empresa & {
  vatRate: Prisma.Decimal | number;
  vatPercent: number;
};
