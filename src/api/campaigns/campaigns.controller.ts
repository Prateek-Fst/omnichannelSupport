import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { CampaignsService } from "./campaigns.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RbacGuard } from "../auth/guards/rbac.guard"
import { Roles } from "../auth/decorators/roles.decorator"

@ApiTags("campaigns")
@Controller("orgs/:orgId/campaigns")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  async getCampaigns(@Param('orgId') orgId: string) {
    return this.campaignsService.getCampaigns(orgId);
  }

  @Get(":campaignId")
  async getCampaignById(@Param('orgId') orgId: string, @Param('campaignId') campaignId: string) {
    return this.campaignsService.getCampaignById(orgId, campaignId)
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async createCampaign(@Param('orgId') orgId: string, @Body() body: any, @Request() req) {
    return this.campaignsService.createCampaign(orgId, body, req.user.id)
  }

  @Post(":campaignId/recipients")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async addRecipients(@Param('campaignId') campaignId: string, @Body() body: { recipients: string[] }) {
    return this.campaignsService.addRecipients(campaignId, body.recipients)
  }

  @Post(":campaignId/start")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async startCampaign(@Param('orgId') orgId: string, @Param('campaignId') campaignId: string, @Request() req) {
    return this.campaignsService.startCampaign(orgId, campaignId, req.user.id)
  }

  @Get(":campaignId/recipients")
  async getRecipients(@Param('orgId') orgId: string, @Param('campaignId') campaignId: string) {
    return this.campaignsService.getRecipients(orgId, campaignId)
  }

  @Get(":campaignId/stats")
  async getCampaignStats(@Param('orgId') orgId: string, @Param('campaignId') campaignId: string) {
    return this.campaignsService.getCampaignStats(orgId, campaignId)
  }
}
