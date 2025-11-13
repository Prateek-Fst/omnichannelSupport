import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { TicketsService } from "./tickets.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("tickets")
@Controller("orgs/:orgId/tickets")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async getTickets(@Param('orgId') orgId: string, @Query() filters: any, @Request() req) {
    return this.ticketsService.getTickets(orgId, filters)
  }

  @Get(':ticketId')
  async getTicketById(
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketsService.getTicketById(ticketId);
  }

  @Post()
  async createTicket(@Param('orgId') orgId: string, @Body() body: any, @Request() req) {
    return this.ticketsService.createTicket(orgId, body, req.user.id)
  }

  @Put(":ticketId")
  async updateTicket(@Param('ticketId') ticketId: string, @Body() body: any, @Request() req) {
    return this.ticketsService.updateTicket(ticketId, body, req.user.id)
  }

  @Post(":ticketId/assign")
  async assignTicket(@Param('ticketId') ticketId: string, @Body() body: { assigneeId: string }, @Request() req) {
    return this.ticketsService.assignTicket(ticketId, body.assigneeId, req.user.id)
  }

  @Post(":ticketId/close")
  async closeTicket(@Param('ticketId') ticketId: string, @Request() req) {
    return this.ticketsService.closeTicket(ticketId, req.user.id)
  }
}
