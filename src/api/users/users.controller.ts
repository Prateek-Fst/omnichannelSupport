import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { UsersService } from "./users.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RbacGuard } from "../auth/guards/rbac.guard"
import { Roles } from "../auth/decorators/roles.decorator"

@ApiTags("users")
@Controller("orgs/users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getUsers(@Request() req) {
    return this.usersService.getUsers(req.params.orgId);
  }

  @Get(":userId")
  async getUserById(@Param('userId') userId: string, @Request() req) {
    return this.usersService.getUserById(req.params.orgId, userId)
  }

  @Post(":userId/deactivate")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async deactivateUser(@Param('userId') userId: string, @Request() req) {
    return this.usersService.deactivateUser(req.params.orgId, userId, req.user.id)
  }

  @Post("invites")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async sendInvite(@Body() body: { email: string; role: string }, @Request() req) {
    return this.usersService.sendInvite(req.params.orgId, body.email, body.role, req.user.id)
  }

  @Get('invites/list')
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  async listInvites(@Request() req) {
    return this.usersService.listInvites(req.params.orgId, req.user.id);
  }
}
