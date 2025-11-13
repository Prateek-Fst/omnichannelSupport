import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import type { PrismaService } from "../../common/prisma/prisma.service"
import { Queue } from "bull"
import { logger } from "../../common/logger"

@Injectable()
export class MessagesService {
  private outboundQueue: Queue

  constructor(private prisma: PrismaService) {
    this.outboundQueue = new Queue("outbound")
  }

  async getMessages(orgId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    return this.prisma.message.findMany({
      where: { ticketId },
      include: {
        senderUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  async createMessage(orgId: string, ticketId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester) {
      throw new ForbiddenException("User not found")
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
      include: { channel: true },
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    // Agents can only send messages on their assigned tickets
    if (requester.role === "AGENT" && ticket.assigneeId !== requesterId) {
      throw new ForbiddenException("You can only send messages on your assigned tickets")
    }

    const message = await this.prisma.message.create({
      data: {
        ticketId,
        orgId,
        channelId: ticket.channelId,
        direction: "OUTBOUND",
        senderUserId: requesterId,
        senderName: requester.name,
        content: data.content,
        metadata: data.metadata || {},
      },
      include: {
        senderUser: { select: { id: true, name: true } },
      },
    })

    // Queue for sending
    await this.outboundQueue.add(
      "send-message",
      {
        messageId: message.id,
        ticketId,
        channelId: ticket.channelId,
        externalThreadId: ticket.externalThreadId,
        content: message.content,
        senderName: message.senderName,
      },
      {
        priority: 1,
        removeOnComplete: true,
      },
    )

    logger.info(`Message created and queued: ${message.id} for ticket ${ticketId}`)

    // Update ticket status to PENDING if it was OPEN
    if (ticket.status === "OPEN") {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "PENDING" },
      })
    }

    return message
  }

  async createInboundMessage(orgId: string, ticketId: string, data: any) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    const message = await this.prisma.message.create({
      data: {
        ticketId,
        orgId,
        channelId: ticket.channelId,
        direction: "INBOUND",
        externalMessageId: data.externalMessageId,
        senderName: data.senderName,
        content: data.content,
        metadata: data.metadata || {},
      },
      include: {
        senderUser: { select: { id: true, name: true } },
      },
    })

    // Update ticket status to PENDING if it was OPEN
    if (ticket.status === "OPEN") {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "PENDING" },
      })
    }

    logger.info(`Inbound message created: ${message.id} for ticket ${ticketId}`)

    return message
  }

  async findOrCreateTicket(orgId: string, channelId: string, externalThreadId: string, subject?: string) {
    let ticket = await this.prisma.ticket.findFirst({
      where: { channelId, externalThreadId, orgId },
    })

    if (!ticket) {
      ticket = await this.prisma.ticket.create({
        data: {
          orgId,
          channelId,
          externalThreadId,
          subject: subject || "New ticket",
          status: "OPEN",
          priority: "MEDIUM",
        },
      })

      logger.info(`Ticket auto-created: ${ticket.id}`)
    }

    return ticket
  }
}
