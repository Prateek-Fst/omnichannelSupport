import { Module } from "@nestjs/common"
import { ChannelsService } from "./channels.service"
import { ChannelsController } from "./channels.controller"
import { ConnectorFactory } from "../../connectors/connector.factory"

@Module({
  providers: [ChannelsService, ConnectorFactory],
  controllers: [ChannelsController],
  exports: [ConnectorFactory],
})
export class ChannelsModule {}
