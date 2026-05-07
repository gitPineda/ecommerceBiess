import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { resolve4 } from 'node:dns/promises';
import { isIP } from 'node:net';

type PasswordResetEmailInput = {
  fromEmail: string;
  appName: string;
  toEmail: string;
  recipientName: string;
  code: string;
  expiresInMinutes: number;
};

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetCodeEmail(input: PasswordResetEmailInput) {
    const transporter = await this.getTransporter();
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME')?.trim() || input.appName.trim();
    const fromAddress = `${fromName} <${input.fromEmail.trim().toLowerCase()}>`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: input.toEmail.trim().toLowerCase(),
        subject: `${input.appName} | Recuperacion de clave`,
        text: [
          `Hola ${input.recipientName},`,
          '',
          'Recibimos una solicitud para restablecer tu clave.',
          `Tu codigo de recuperacion es: ${input.code}`,
          `Este codigo expira en ${input.expiresInMinutes} minuto(s).`,
          '',
          'Abre la aplicacion, ingresa este codigo y luego define tu nueva clave.',
          '',
          `Si no solicitaste este cambio, ignora este mensaje o contacta a ${input.fromEmail}.`,
        ].join('\n'),
        html: [
          `<p>Hola ${this.escapeHtml(input.recipientName)},</p>`,
          '<p>Recibimos una solicitud para restablecer tu clave.</p>',
          `<p><strong>Codigo de recuperacion:</strong> <span style="font-size:18px;letter-spacing:2px;">${this.escapeHtml(input.code)}</span></p>`,
          `<p>Este codigo expira en <strong>${input.expiresInMinutes} minuto(s)</strong>.</p>`,
          '<p>Abre la aplicacion, ingresa este codigo y luego define tu nueva clave.</p>',
          `<p>Si no solicitaste este cambio, ignora este mensaje o contacta a ${this.escapeHtml(input.fromEmail)}.</p>`,
        ].join(''),
      });
    } catch (error) {
      const smtpUser =
        this.configService.get<string>('SMTP_USER')?.trim().toLowerCase() || 'sin-configurar';
      const details =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);

      console.error('[MAIL][PASSWORD_RESET]', {
        fromAddress,
        smtpUser,
        toEmail: input.toEmail.trim().toLowerCase(),
        details,
      });

      throw new InternalServerErrorException(
        'No fue posible enviar el correo de recuperacion. Verifica la configuracion SMTP del servidor.',
      );
    }
  }

  private async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.configService.get<string>('SMTP_PORT') || '587');
    const secure = this.parseBoolean(this.configService.get<string>('SMTP_SECURE'));
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.trim();

    if (!host || !port || !user || !pass) {
      throw new ServiceUnavailableException(
        'La configuracion SMTP no esta disponible para enviar correos.',
      );
    }

    let smtpHost = host;
    let servername: string | undefined;

    if (!isIP(host)) {
      try {
        const ipv4Addresses = await resolve4(host);

        if (ipv4Addresses.length > 0) {
          smtpHost = ipv4Addresses[0];
          servername = host;
        }
      } catch (error) {
        const details =
          error instanceof Error ? `${error.name}: ${error.message}` : String(error);

        console.warn('[MAIL][SMTP_DNS_IPV4_FALLBACK]', {
          host,
          details,
        });
      }
    }

    this.transporter = createTransport({
      host: smtpHost,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: servername
        ? {
            servername,
          }
        : undefined,
    });

    return this.transporter;
  }

  private parseBoolean(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase() === 'true';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
