import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { MessagesService } from "./messages.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@ApiTags("messages")
@Controller("orgs/:orgId/tickets/:ticketId/messages")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async getMessages(@Param('orgId') orgId: string, @Param('ticketId') ticketId: string) {
    return this.messagesService.getMessages(orgId, ticketId)
  }

  @Post()
  async createMessage(
    @Param('ticketId') ticketId: string,
    @Body() body: { content: string; metadata?: any },
    @Request() req,
  ) {
    return this.messagesService.createMessage(req.params.orgId, ticketId, body, req.user.id)
  }
}
