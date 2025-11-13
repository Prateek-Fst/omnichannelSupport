import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { MacrosService } from "./macros.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("macros")
@Controller("orgs/macros")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MacrosController {
  constructor(private macrosService: MacrosService) {}

  @Get(':orgId')
  async getMacros(@Param('orgId') orgId: string) {
    return this.macrosService.getMacros(orgId);
  }

  @Post(":orgId")
  async createMacro(@Param('orgId') orgId: string, @Body() body: { name: string; content: string }, @Request() req) {
    return this.macrosService.createMacro(orgId, body, req.user.id)
  }

  @Put(":orgId/:macroId")
  async updateMacro(
    @Param('orgId') orgId: string,
    @Param('macroId') macroId: string,
    @Body() body: { name?: string; content?: string },
    @Request() req,
  ) {
    return this.macrosService.updateMacro(orgId, macroId, body, req.user.id)
  }

  @Delete(":orgId/:macroId")
  async deleteMacro(@Param('orgId') orgId: string, @Param('macroId') macroId: string, @Request() req) {
    return this.macrosService.deleteMacro(orgId, macroId, req.user.id)
  }
}
