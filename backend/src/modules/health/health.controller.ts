import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BACKEND_BUILD_MARKER = 'payphone-debug-minimal-20260416-01';

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getStatus() {
    const token = this.configService.get<string>('PAYPHONE_TOKEN') || '';
    const baseUrl =
      this.configService.get<string>('PAYPHONE_API_BASE_URL') ||
      'https://pay.payphonetodoesposible.com/api';
    const storeId = this.configService.get<string>('PAYPHONE_STORE_ID') || '';

    return {
      status: 'ok',
      service: 'backend',
      marker: BACKEND_BUILD_MARKER,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
      },
      payphone: {
        baseUrl,
        storeId,
        tokenSuffix: token.slice(-8),
        payloadMode: 'minimal-hardcoded-sale',
      },
    };
  }

  @Get('build')
  getBuildInfo() {
    const token = this.configService.get<string>('PAYPHONE_TOKEN') || '';
    const baseUrl =
      this.configService.get<string>('PAYPHONE_API_BASE_URL') ||
      'https://pay.payphonetodoesposible.com/api';
    const storeId = this.configService.get<string>('PAYPHONE_STORE_ID') || '';

    return {
      status: 'ok',
      service: 'backend',
      marker: BACKEND_BUILD_MARKER,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
      },
      payphone: {
        baseUrl,
        storeId,
        tokenSuffix: token.slice(-8),
        payloadMode: 'minimal-hardcoded-sale',
      },
    };
  }
}
