import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { UsersService } from "./users.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RbacGuard } from "../auth/guards/rbac.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { SendInviteDto } from "./dto/send-invite.dto"

@ApiTags("users")
@Controller("orgs/:orgId/users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getUsers(@Param('orgId') orgId: string) {
    return this.usersService.getUsers(orgId);
  }

  @Get(":userId")
  async getUserById(@Param('orgId') orgId: string, @Param('userId') userId: string) {
    return this.usersService.getUserById(orgId, userId)
  }

  @Post(":userId/deactivate")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async deactivateUser(@Param('orgId') orgId: string, @Param('userId') userId: string, @Request() req: any) {
    return this.usersService.deactivateUser(orgId, userId, req.user.id)
  }

  @Post("invites")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async sendInvite(@Param('orgId') orgId: string, @Body() body: SendInviteDto, @Request() req: any) {
    return this.usersService.sendInvite(orgId, body.email, body.role, req.user.id)
  }

  @Get('invites/list')
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  async listInvites(@Param('orgId') orgId: string, @Request() req: any) {
    return this.usersService.listInvites(orgId, req.user.id);
  }
}