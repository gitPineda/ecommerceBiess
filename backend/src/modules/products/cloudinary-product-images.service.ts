import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';

type UploadProductImageInput = {
  base64: string;
  mimeType: string;
  fileName?: string;
  sellerId: string;
  sku: string;
};

type CloudinaryConfiguration = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

type CloudinaryUploadResponse = {
  asset_id?: string;
  public_id?: string;
  version?: number | string;
  version_id?: string;
  signature?: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  secure_url?: string;
  url?: string;
  bytes?: number;
  created_at?: string;
  original_filename?: string;
  error?: {
    message?: string;
  };
};

type CloudinaryDestroyResponse = {
  result?: string;
  error?: {
    message?: string;
  };
};

type CloudinaryHttpResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
};

const CLOUDINARY_PROVIDER = 'cloudinary';
const DEFAULT_PRODUCTS_FOLDER = 'products';
const MAX_IMAGE_BASE64_LENGTH = 8_500_000;

@Injectable()
export class CloudinaryProductImagesService {
  constructor(private readonly configService: ConfigService) {}

  async uploadProductImage(input: UploadProductImageInput) {
    const configuration = this.ensureConfigured();
    const normalizedMimeType = input.mimeType.trim().toLowerCase() || 'image/jpeg';
    const normalizedBase64 = input.base64.trim();

    if (!normalizedMimeType.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten imagenes para productos.');
    }

    if (!normalizedBase64) {
      throw new BadRequestException('La imagen del producto esta vacia.');
    }

    if (normalizedBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      throw new BadRequestException(
        'La imagen es demasiado grande. Usa una imagen mas ligera antes de subirla.',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = `${this.slugify(input.sku)}-${Date.now()}`;
    const folder = `${configuration.folder}/${this.slugify(input.sellerId)}`;
    const signature = this.signRequest(
      {
        folder,
        public_id: publicId,
        timestamp,
      },
      configuration.apiSecret,
    );
    const params = new URLSearchParams({
      api_key: configuration.apiKey,
      file: `data:${normalizedMimeType};base64,${normalizedBase64}`,
      folder,
      public_id: publicId,
      signature,
      timestamp,
    });
    const response = await this.sendFormRequest(
      this.buildApiUrl(configuration.cloudName, '/image/upload'),
      params,
    );
    const payload = this.parseJsonResponse<CloudinaryUploadResponse>(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300 || payload.error) {
      throw new BadGatewayException(
        payload.error?.message ||
          'Cloudinary no acepto la imagen del producto.',
      );
    }

    if (!payload.secure_url || !payload.public_id) {
      throw new BadGatewayException(
        'Cloudinary no devolvio la informacion necesaria de la imagen.',
      );
    }

    return {
      provider: CLOUDINARY_PROVIDER,
      publicId: payload.public_id,
      assetId: payload.asset_id || '',
      url: payload.url || payload.secure_url,
      secureUrl: payload.secure_url,
      thumbUrl: this.buildTransformedUrl(
        payload.secure_url,
        'c_fill,g_auto,h_96,w_96/f_auto,q_auto',
      ),
      cardUrl: this.buildTransformedUrl(
        payload.secure_url,
        'c_fill,g_auto,h_320,w_320/f_auto,q_auto',
      ),
      detailUrl: this.buildTransformedUrl(
        payload.secure_url,
        'c_fill,g_auto,h_720,w_720/f_auto,q_auto',
      ),
      width: payload.width || null,
      height: payload.height || null,
      bytes: payload.bytes || null,
      format: payload.format || null,
      resourceType: payload.resource_type || 'image',
      mimeType: normalizedMimeType,
      folder,
      version: payload.version ? String(payload.version) : null,
      originalName:
        input.fileName?.trim() ||
        payload.original_filename?.trim() ||
        `${publicId}.${this.inferExtension(normalizedMimeType)}`,
      uploadedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    };
  }

  async destroyImageByPublicId(publicId: string) {
    if (!publicId.trim()) {
      return;
    }

    const configuration = this.ensureConfigured();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.signRequest(
      {
        invalidate: 'true',
        public_id: publicId.trim(),
        timestamp,
      },
      configuration.apiSecret,
    );
    const params = new URLSearchParams({
      api_key: configuration.apiKey,
      invalidate: 'true',
      public_id: publicId.trim(),
      signature,
      timestamp,
    });
    const response = await this.sendFormRequest(
      this.buildApiUrl(configuration.cloudName, '/image/destroy'),
      params,
    );
    const payload = this.parseJsonResponse<CloudinaryDestroyResponse>(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300 || payload.error) {
      throw new BadGatewayException(
        payload.error?.message ||
          'No fue posible eliminar la imagen en Cloudinary.',
      );
    }
  }

  private ensureConfigured(): CloudinaryConfiguration {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary no esta configurado en el backend.',
      );
    }

    const rawFolder =
      this.configService.get<string>('CLOUDINARY_PRODUCTS_FOLDER') ||
      DEFAULT_PRODUCTS_FOLDER;
    const normalizedFolder = rawFolder
      .trim()
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    return {
      cloudName,
      apiKey,
      apiSecret,
      folder: normalizedFolder || DEFAULT_PRODUCTS_FOLDER,
    };
  }

  private buildApiUrl(cloudName: string, path: string) {
    return `https://api.cloudinary.com/v1_1/${cloudName}${path}`;
  }

  private signRequest(
    params: Record<string, string | number | boolean | null | undefined>,
    apiSecret: string,
  ) {
    const stringifiedParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)] as const)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return createHash('sha1')
      .update(`${stringifiedParams}${apiSecret}`)
      .digest('hex');
  }

  private buildTransformedUrl(secureUrl: string, transformation: string) {
    return secureUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  private inferExtension(mimeType: string) {
    if (mimeType === 'image/png') {
      return 'png';
    }

    if (mimeType === 'image/webp') {
      return 'webp';
    }

    return 'jpg';
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9/_-]+/g, '-')
      .replace(/\/{2,}/g, '/')
      .replace(/^-+|-+$/g, '')
      .replace(/\/-+|-+\//g, '/')
      .slice(0, 120) || 'product';
  }

  private sendFormRequest(requestUrl: string, params: URLSearchParams) {
    const requestBody = params.toString();

    return new Promise<CloudinaryHttpResponse>((resolve, reject) => {
      const url = new URL(requestUrl);
      const request = httpsRequest(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(requestBody),
          },
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

      request.on('error', reject);
      request.write(requestBody);
      request.end();
    });
  }

  private parseJsonResponse<T>(value: string) {
    const normalized = value.replace(/^\uFEFF/, '').trim();

    if (!normalized) {
      return {} as T;
    }

    try {
      return JSON.parse(normalized) as T;
    } catch {
      throw new BadGatewayException(
        'Cloudinary devolvio una respuesta invalida.',
      );
    }
  }
}
