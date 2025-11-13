import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { WebhooksController } from "./webhooks.controller"
import { ChannelsModule } from "../channels/channels.module"

@Module({
  imports: [
    BullModule.registerQueue({
      name: "inbound",
    }),
    ChannelsModule,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
