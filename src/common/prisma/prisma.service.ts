import { Injectable, type OnModuleInit, type OnModuleDestroy } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"
import { logger } from "../logger"

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
    logger.info("Prisma connected to database")
  }

  async onModuleDestroy() {
    await this.$disconnect()
    logger.info("Prisma disconnected from database")
  }
}
