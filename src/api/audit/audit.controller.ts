import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { AuditService } from "./audit.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RbacGuard } from "../auth/guards/rbac.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import type { PrismaService } from "../../common/prisma/prisma.service"

@ApiTags("audit")
@Controller("orgs/:orgId/audit-logs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async getAuditLogs(@Param('orgId') orgId: string, @Query() filters: any) {
    return this.auditService.getAuditLogs(orgId, filters)
  }

  @Get('summary')
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  async getActionSummary(@Param('orgId') orgId: string) {
    return this.auditService.getActionSummary(orgId);
  }

  @Get("user/:userId")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async getUserActivity(@Param('orgId') orgId: string, @Param('userId') userId: string) {
    return this.auditService.getUserActivity(orgId, userId)
  }
}
