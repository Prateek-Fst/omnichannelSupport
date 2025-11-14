import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { AnalyticsService } from "./analytics.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("analytics")
@Controller("orgs/analytics")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get("tickets")
  async getTicketAnalytics(@Param('orgId') orgId: string, @Query() filters: any) {
    return this.analyticsService.getTicketAnalytics(orgId, filters)
  }

  @Get('channels')
  async getChannelStats(@Param('orgId') orgId: string) {
    return this.analyticsService.getChannelStats(orgId);
  }

  @Get('campaigns')
  async getCampaignStats(@Param('orgId') orgId: string) {
    return this.analyticsService.getCampaignStats(orgId);
  }

  @Get('agents')
  async getAgentPerformance(@Param('orgId') orgId: string) {
    return this.analyticsService.getAgentPerformance(orgId);
  }
}
