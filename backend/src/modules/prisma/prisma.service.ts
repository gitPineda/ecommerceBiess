import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from './prisma-client-options';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super(createPrismaClientOptions());
  }

  async onModuleInit() {
    console.log('[prisma] connecting');
    await this.$connect();
    console.log('[prisma] connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
