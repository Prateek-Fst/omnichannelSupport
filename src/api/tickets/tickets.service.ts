import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import { PrismaService } from "../../common/prisma/prisma.service"
import { logger } from "../../common/logger"

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async getTickets(orgId: string, filters: any) {
    const where: any = { orgId }

    if (filters.status) where.status = filters.status
    if (filters.assigneeId) where.assigneeId = filters.assigneeId
    if (filters.channelId) where.channelId = filters.channelId

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        channel: { select: { id: true, name: true, type: true } },
        assignee: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, platform: true } },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: "desc" },
    })

    return tickets
  }

  async getTicketById(orgId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
      include: {
        channel: { select: { id: true, name: true, type: true } },
        assignee: { select: { id: true, name: true, email: true } },
        messages: {
          include: { senderUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    return ticket
  }

  async createTicket(orgId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can manually create tickets")
    }

    const channel = await this.prisma.channel.findFirst({
      where: { id: data.channelId, orgId },
    })

    if (!channel) {
      throw new NotFoundException("Channel not found")
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        orgId,
        channelId: data.channelId,
        externalThreadId: data.externalThreadId || `manual-${Date.now()}`,
        subject: data.subject,
        status: data.status || "OPEN",
        priority: data.priority || "MEDIUM",
        assigneeId: data.assigneeId,
      },
      include: {
        channel: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    logger.info(`Ticket created: ${ticket.id} in org ${orgId}`)

    return ticket
  }

  async updateTicket(orgId: string, ticketId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester) {
      throw new ForbiddenException("User not found")
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    // Agents can only update their own assigned tickets
    if (requester.role === "AGENT" && ticket.assigneeId !== requesterId) {
      throw new ForbiddenException("You can only update your assigned tickets")
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
      },
      include: {
        channel: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    logger.info(`Ticket updated: ${ticketId} by ${requesterId}`)

    return updated
  }

  async assignTicket(orgId: string, ticketId: string, assigneeId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can assign tickets")
    }

    const assignee = await this.prisma.user.findFirst({
      where: { id: assigneeId, orgId },
    })

    if (!assignee) {
      throw new NotFoundException("Assignee not found")
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assigneeId },
      include: {
        channel: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    logger.info(`Ticket ${ticketId} assigned to ${assigneeId}`)

    return ticket
  }

  async closeTicket(orgId: string, ticketId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester) {
      throw new ForbiddenException("User not found")
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orgId },
    })

    if (!ticket) {
      throw new NotFoundException("Ticket not found")
    }

    // Agents can only close their own tickets
    if (requester.role === "AGENT" && ticket.assigneeId !== requesterId) {
      throw new ForbiddenException("You can only close your assigned tickets")
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
    })

    logger.info(`Ticket closed: ${ticketId}`)

    return updated
  }
}
