import { Module } from "@nestjs/common"
import { ChannelsService } from "./channels.service"
import { EmailService } from "./email.service"
import { ChannelsController } from "./channels.controller"
import { ConnectorFactory } from "../../connectors/connector.factory"
import { PrismaModule } from "../../common/prisma/prisma.module"

@Module({
  imports: [PrismaModule],
  providers: [ChannelsService, EmailService, ConnectorFactory],
  controllers: [ChannelsController],
  exports: [ConnectorFactory],
})
export class ChannelsModule {}
