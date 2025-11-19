import { Module } from "@nestjs/common"
import { UsersService } from "./users.service"
import { UsersController } from "./users.controller"
import { EmailService } from "../../common/email/email.service"
import { RbacGuard } from "../auth/guards/rbac.guard"

@Module({
  providers: [UsersService, EmailService, RbacGuard],
  controllers: [UsersController],
})
export class UsersModule {}
