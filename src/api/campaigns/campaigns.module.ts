import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { CampaignsService } from "./campaigns.service"
import { CampaignsController } from "./campaigns.controller"
import { ChannelsModule } from "../channels/channels.module"
import { PrismaModule } from "../../common/prisma/prisma.module"

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: "campaigns",
    }),
    ChannelsModule,
  ],
  providers: [CampaignsService],
  controllers: [CampaignsController],
})
export class CampaignsModule {}
