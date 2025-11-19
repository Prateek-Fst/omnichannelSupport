import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { WebhooksController } from "./webhooks.controller"
import { EmailTestController } from "./email-test.controller"
import { ChannelsModule } from "../channels/channels.module"
import { PrismaModule } from "../../common/prisma/prisma.module"

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: "inbound",
    }),
    ChannelsModule,
  ],
  controllers: [WebhooksController, EmailTestController],
})
export class WebhooksModule {}
