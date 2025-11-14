import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./common/prisma/prisma.module"
import { AuthModule } from "./api/auth/auth.module"
import { UsersModule } from "./api/users/users.module"
import { OrganisationsModule } from "./api/organisations/organisations.module"
import { ChannelsModule } from "./api/channels/channels.module"
import { TicketsModule } from "./api/tickets/tickets.module"
import { MessagesModule } from "./api/messages/messages.module"
import { CampaignsModule } from "./api/campaigns/campaigns.module"
import { MacrosModule } from "./api/macros/macros.module"
import { AnalyticsModule } from "./api/analytics/analytics.module"
import { AuditModule } from "./api/audit/audit.module"
import { WebhooksModule } from "./api/webhooks/webhooks.module"
import { CustomersModule } from "./api/customers/customers.module"
import { NotificationsModule } from "./api/notifications/notifications.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganisationsModule,
    ChannelsModule,
    TicketsModule,
    MessagesModule,
    CustomersModule,
    NotificationsModule,
    CampaignsModule,
    MacrosModule,
    AnalyticsModule,
    AuditModule,
    WebhooksModule,
  ],
})
export class AppModule {}
