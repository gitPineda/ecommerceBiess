import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import type { IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';
import {
  DEFAULT_CURRENCY,
  PAYPHONE_DEFAULT_COUNTRY_CODE,
} from '../../config/commerce';

interface PayphoneRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

interface PayphoneCreateSaleInput {
  clientTransactionId: string;
  phoneNumber: string;
  countryCode: string;
  amount: number;
  amountWithoutTax: number;
  amountWithTax: number;
  tax: number;
  service: number;
  tip: number;
  reference: string;
  timeZone?: number;
  lat?: string;
  lng?: string;
  clientUserId?: string;
  optionalParameter1?: string;
  optionalParameter2?: string;
  optionalParameter3?: string;
  responseUrl?: string;
  order?: Record<string, unknown>;
}

export interface PayphoneTransactionResponse {
  transactionId?: number | string;
  clientTransactionId?: string;
  transactionStatus?: string;
  statusCode?: number;
  authorizationCode?: string | null;
  message?: string | null;
  messageCode?: number | null;
  phoneNumber?: string;
  date?: string;
  [key: string]: unknown;
}

interface PayphoneLogContext {
  method: string;
  path: string;
  url?: string;
  status?: number;
  contentType?: string | null;
  baseUrl?: string;
  storeId?: string;
  tokenSuffix?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: string;
  parsedResponse?: unknown;
  errorMessage?: string;
}

interface PayphoneHttpResponse {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
}

@Injectable()
export class PayphoneService {
  constructor(private readonly configService: ConfigService) {}

  normalizePhoneNumber(rawPhoneNumber: string) {
    const digitsOnly = rawPhoneNumber.replace(/\D/g, '');

    if (!digitsOnly) {
      throw new BadRequestException('Ingresa un telefono valido para PayPhone.');
    }

    if (digitsOnly.startsWith('593') && digitsOnly.length === 12) {
      return `0${digitsOnly.slice(3)}`;
    }

    if (digitsOnly.length === 9 && digitsOnly.startsWith('9')) {
      return `0${digitsOnly}`;
    }

    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return digitsOnly;
    }

    throw new BadRequestException(
      'El telefono debe tener formato ecuatoriano valido, por ejemplo 0984112233.',
    );
  }

  getDefaultCountryCode() {
    return (
      this.configService.get<string>('PAYPHONE_COUNTRY_CODE') ||
      PAYPHONE_DEFAULT_COUNTRY_CODE
    );
  }

  ensureConfigured() {
    const token = this.configService.get<string>('PAYPHONE_TOKEN');
    const storeId = this.configService.get<string>('PAYPHONE_STORE_ID');

    if (!token || !storeId) {
      throw new InternalServerErrorException(
        'PayPhone no esta configurado en el backend.',
      );
    }

    return {
      token,
      storeId,
      baseUrl: this.normalizeApiBaseUrl(
        this.configService.get<string>('PAYPHONE_API_BASE_URL') ||
          'https://pay.payphonetodoesposible.com/api',
      ),
    };
  }

  async checkUserRegistration(phoneNumber: string, countryCode: string) {
    const normalizedPhoneNumber = this.normalizePhoneNumber(phoneNumber);
    const normalizedCountryCode = countryCode.trim() || this.getDefaultCountryCode();
    const response = await this.request<boolean | string>(
      `/Users/check/${normalizedPhoneNumber}/region/${normalizedCountryCode}`,
    );

    if (typeof response === 'boolean') {
      return response;
    }

    if (typeof response === 'string') {
      return response.trim().toLowerCase() === 'true';
    }

    return Boolean(response);
  }

  async createSale(payload: PayphoneCreateSaleInput) {
    const configuration = this.ensureConfigured();
    const generatedClientTransactionId =
      payload.clientTransactionId || `ID_UNICO_X_TRANSACCION-${Date.now()}`;
    const normalizedPhoneNumber = this.normalizePhoneNumber(payload.phoneNumber);
    const normalizedCountryCode =
      payload.countryCode.trim() || this.getDefaultCountryCode();

    const response = await this.request<
      PayphoneTransactionResponse | PayphoneTransactionResponse[]
    >('/Sale', {
      method: 'POST',
      body: this.removeUndefinedFields({
        phoneNumber: normalizedPhoneNumber,
        countryCode: normalizedCountryCode,
        amount: payload.amount,
        amountWithoutTax: payload.amountWithoutTax,
        amountWithTax: payload.amountWithTax,
        tax: payload.tax,
        service: payload.service,
        tip: payload.tip,
        reference: payload.reference,
        storeId: configuration.storeId,
        currency: DEFAULT_CURRENCY,
        clientTransactionId: generatedClientTransactionId,
        timeZone: payload.timeZone,
        lat: payload.lat,
        lng: payload.lng,
        clientUserId: payload.clientUserId,
        optionalParameter1: payload.optionalParameter1,
        optionalParameter2: payload.optionalParameter2,
        optionalParameter3: payload.optionalParameter3,
        responseUrl: payload.responseUrl,
        order: payload.order,
      }),
    });

    return this.normalizeTransactionResponse(
      response,
      'crear la transaccion PayPhone',
    );
  }

  async getSaleByClientTransactionId(clientTransactionId: string) {
    if (!clientTransactionId.trim()) {
      throw new BadRequestException(
        'La transaccion PayPhone no tiene clientTransactionId.',
      );
    }

    const response = await this.request<
      PayphoneTransactionResponse | PayphoneTransactionResponse[]
    >(
      `/Sale/client/${encodeURIComponent(clientTransactionId.trim())}`,
    );

    return this.normalizeTransactionResponse(
      response,
      'consultar la transaccion PayPhone',
    );
  }

  private async request<T>(
    path: string,
    options: PayphoneRequestOptions = {},
  ): Promise<T> {
    const configuration = this.ensureConfigured();
    const method = options.method || 'GET';
    const requestUrl = `${configuration.baseUrl}${path}`;
    const requestBody = options.body ? JSON.stringify(options.body) : undefined;

    try {
      console.log(`[PayPhone] ${method} ${requestUrl}`);

      const response = await this.sendRequest(
        requestUrl,
        method,
        configuration.token,
        requestBody,
      );
      const responseText = response.body;
      const contentType = this.getHeaderValue(response.headers['content-type']);
      const payload = responseText
        ? this.parseResponseBody(responseText, contentType)
        : null;

      if (response.statusCode < 200 || response.statusCode >= 300) {
        const referenceId = this.writeLog({
          method,
          path,
          url: requestUrl,
          status: response.statusCode,
          contentType,
          baseUrl: configuration.baseUrl,
          storeId: configuration.storeId,
          tokenSuffix: this.getTokenSuffix(configuration.token),
          requestBody: options.body,
          responseBody: responseText,
          parsedResponse: payload,
          errorMessage:
            this.extractMessage(payload) ||
            `PayPhone respondio con estado ${response.statusCode}.`,
        });
        const errorMessage =
          this.extractMessage(payload) ||
          `PayPhone respondio con estado ${response.statusCode}.`;

        throw new BadGatewayException(`${errorMessage} Ref: ${referenceId}`);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const referenceId = this.writeLog({
        method,
        path,
        url: requestUrl,
        baseUrl: configuration.baseUrl,
        storeId: configuration.storeId,
        tokenSuffix: this.getTokenSuffix(configuration.token),
        requestBody: options.body,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Error desconocido al conectar con PayPhone.',
      });

      throw new BadGatewayException(
        `No se pudo completar la comunicacion con PayPhone. Ref: ${referenceId}`,
      );
    }
  }

  private writeLog(context: PayphoneLogContext) {
    const timestamp = new Date().toISOString();
    const referenceId = `PP-${timestamp.replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, '0')}`;
    const logsDirectory = join(process.cwd(), 'logs');

    if (!existsSync(logsDirectory)) {
      mkdirSync(logsDirectory, { recursive: true });
    }

    const logFilePath = join(logsDirectory, 'payphone-errors.log');
    const entry = {
      referenceId,
      timestamp,
      ...context,
    };

    appendFileSync(
      logFilePath,
      `${JSON.stringify(entry, null, 2)}\n---\n`,
      'utf8',
    );

    console.error(`[PayPhone][${referenceId}]`, entry);

    return referenceId;
  }

  private extractMessage(payload: unknown) {
    if (typeof payload === 'string') {
      const normalized = payload.trim();

      if (this.looksLikeHtml(normalized)) {
        return 'PayPhone devolvio un error interno en su servicio.';
      }

      return normalized;
    }

    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const candidate =
      (payload as Record<string, unknown>).message ||
      (payload as Record<string, unknown>).error ||
      (payload as Record<string, unknown>).mensaje;

    if (typeof candidate === 'string') {
      return candidate;
    }

    return '';
  }

  private looksLikeHtml(value: string) {
    const normalized = value.toLowerCase();
    return (
      normalized.includes('<!doctype html') ||
      normalized.includes('<html') ||
      normalized.includes('</html>')
    );
  }

  private normalizeApiBaseUrl(rawBaseUrl: string) {
    const normalized = rawBaseUrl.trim().replace(/\/+$/, '');

    if (/\/api\/sale$/i.test(normalized)) {
      return normalized.replace(/\/sale$/i, '');
    }

    return normalized;
  }

  private removeUndefinedFields(payload: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
  }

  private normalizeTransactionResponse(
    payload: PayphoneTransactionResponse | PayphoneTransactionResponse[],
    action: string,
  ) {
    if (Array.isArray(payload)) {
      const firstEntry = payload.find(
        (entry) =>
          entry !== null &&
          typeof entry === 'object' &&
          !Array.isArray(entry),
      );

      if (firstEntry) {
        return firstEntry;
      }

      throw new BadGatewayException(
        `PayPhone devolvio una lista vacia al ${action}.`,
      );
    }

    if (payload && typeof payload === 'object') {
      return payload;
    }

    throw new BadGatewayException(
      `PayPhone devolvio una respuesta invalida al ${action}.`,
    );
  }

  private getTokenSuffix(token: string) {
    return token.slice(-8);
  }

  private getHeaderValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return value ?? null;
  }

  private sendRequest(
    requestUrl: string,
    method: 'GET' | 'POST',
    token: string,
    requestBody?: string,
  ) {
    return new Promise<PayphoneHttpResponse>((resolve, reject) => {
      const url = new URL(requestUrl);
      const headers: Record<string, string | number> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
      };

      if (requestBody !== undefined) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(requestBody);
      }

      const req = httpsRequest(
        url,
        {
          method,
          headers,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          response.on('end', () => {
            resolve({
              statusCode: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );

      req.on('error', reject);

      if (requestBody !== undefined) {
        req.write(requestBody);
      }

      req.end();
    });
  }

  private parseResponseBody(rawPayload: string, contentType: string | null) {
    const normalizedPayload = rawPayload.replace(/^\uFEFF/, '').trim();

    if (!normalizedPayload) {
      return null;
    }

    const normalizedLower = normalizedPayload.toLowerCase();

    if (normalizedLower === 'true') {
      return true;
    }

    if (normalizedLower === 'false') {
      return false;
    }

    if (normalizedLower === 'null') {
      return null;
    }

    const shouldAttemptJson =
      Boolean(contentType?.toLowerCase().includes('json')) ||
      normalizedPayload.startsWith('{') ||
      normalizedPayload.startsWith('[') ||
      normalizedPayload.startsWith('"');

    if (!shouldAttemptJson) {
      return normalizedPayload;
    }

    try {
      return JSON.parse(normalizedPayload);
    } catch {
      return normalizedPayload;
    }
  }
}
