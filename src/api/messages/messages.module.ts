import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { MessagesService } from "./messages.service"
import { MessagesController } from "./messages.controller"
import { PrismaModule } from "../../common/prisma/prisma.module"
import { CustomersModule } from "../customers/customers.module"
import { NotificationsModule } from "../notifications/notifications.module"

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: "outbound",
    }),
  ],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
