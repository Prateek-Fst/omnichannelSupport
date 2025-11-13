import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { MessagesService } from "./messages.service"
import { MessagesController } from "./messages.controller"

@Module({
  imports: [
    BullModule.registerQueue({
      name: "outbound",
    }),
  ],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
