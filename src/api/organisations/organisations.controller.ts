import { Controller, Get, Patch, Body, Param, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { OrganisationsService } from "./organisations.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("organisations")
@Controller("orgs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganisationsController {
  constructor(private organisationsService: OrganisationsService) {}

  @Get(':orgId')
  async getOrganisation(@Param('orgId') orgId: string) {
    return this.organisationsService.getOrganisation(orgId);
  }

  @Patch(":orgId")
  async updateOrganisation(@Param('orgId') orgId: string, @Body() data: { name?: string }) {
    return this.organisationsService.updateOrganisation(orgId, data)
  }
}
