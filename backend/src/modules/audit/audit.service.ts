import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isAdminRole } from '../auth/auth-role.utils';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditoriaDto } from './dto/list-auditoria.dto';
import { AuditRequestContext } from './interfaces/audit-request-context.interface';

type AuditDatabaseClient = PrismaService | Prisma.TransactionClient;

interface CreateAuditEntryInput {
  userId: string;
  usuario: string;
  actividad: string;
  context?: AuditRequestContext;
  detalle?: Prisma.InputJsonValue;
  tx?: AuditDatabaseClient;
}

function getAuditTimestamp(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now).reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {} as Record<string, string>);

  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${milliseconds}Z`,
  );
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListAuditoriaDto) {
    if (!isAdminRole(currentUser.role)) {
      throw new ForbiddenException('Solo un administrador puede consultar auditorias.');
    }

    const limit = query.limit || 100;
    const rows = await this.prisma.auditoria.findMany({
      orderBy: {
        fechaHora: 'desc',
      },
      take: limit,
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        usuario: row.usuario,
        actividad: row.actividad,
        fechaHora: row.fechaHora,
        direccionIp: row.direccionIp,
        origenConexion: row.origenConexion,
        detalle: row.detalle,
      })),
      total: rows.length,
    };
  }

  async createEntry(params: CreateAuditEntryInput) {
    const database = params.tx ?? this.prisma;

    await database.auditoria.create({
      data: {
        userId: params.userId,
        usuario: params.usuario.trim(),
        fechaHora: getAuditTimestamp(),
        actividad: params.actividad.trim(),
        direccionIp: params.context?.ipAddress || null,
        origenConexion: params.context?.deviceInfo || null,
        detalle: params.detalle,
      },
    });
  }
}
