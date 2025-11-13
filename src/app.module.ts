import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./common/prisma/prisma.module"
import { AuthModule } from "./api/auth/auth.module"
import { OrganisationsModule } from "./api/organisations/organisations.module"
import { UsersModule } from "./api/users/users.module"
import { ChannelsModule } from "./api/channels/channels.module"
import { TicketsModule } from "./api/tickets/tickets.module"
import { MessagesModule } from "./api/messages/messages.module"
import { MacrosModule } from "./api/macros/macros.module"
import { CampaignsModule } from "./api/campaigns/campaigns.module"
import { AuditModule } from "./api/audit/audit.module"
import { WebhooksModule } from "./api/webhooks/webhooks.module"
import { RedisModule } from "./common/redis/redis.module"
import { BullModule } from "@nestjs/bull"
import { EnvService } from "./config/env.service"

@Module({
  providers: [EnvService],
  exports: [EnvService],
})
class ConfigServiceModule {}


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    ConfigServiceModule,
    PrismaModule,
    RedisModule,
    BullModule.forRootAsync({
      useFactory: async (envService: EnvService) => ({
        redis: {
          host: envService.getString("REDIS_HOST", "localhost"),
          port: envService.getNumber("REDIS_PORT", 6379),
        },
      }),
      inject: [EnvService],
    }),
    AuthModule,
    OrganisationsModule,
    UsersModule,
    ChannelsModule,
    TicketsModule,
    MessagesModule,
    MacrosModule,
    CampaignsModule,
    AuditModule,
    WebhooksModule,
  ],
})
export class AppModule {}
