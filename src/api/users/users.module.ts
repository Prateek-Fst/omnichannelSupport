import { Module } from "@nestjs/common"
import { UsersService } from "./users.service"
import { UsersController } from "./users.controller"
import { RbacGuard } from "../auth/guards/rbac.guard"

@Module({
  providers: [UsersService, RbacGuard],
  controllers: [UsersController],
})
export class UsersModule {}
