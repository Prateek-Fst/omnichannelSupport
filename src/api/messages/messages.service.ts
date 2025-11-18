import { Injectable } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bull"
import { Queue } from "bull"
import { PrismaService } from "../../common/prisma/prisma.service"
import { CustomersService } from "../customers/customers.service"
import { NotificationsService } from "../notifications/notifications.service"
import { logger } from "../../common/logger"
import { v4 as uuid } from "uuid"
import { ChannelType, NotificationType } from "@prisma/client"

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
    private notificationsService: NotificationsService,
    @InjectQueue("outbound") private outboundQueue: Queue,
  ) {}

  async getMessages(orgId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        orgId,
      },
    })

    return this.prisma.message.findMany({
      where: {
        ticketId,
        orgId,
      },
      orderBy: { createdAt: "asc" },
    })
  }

  async createMessage(orgId: string, ticketId: string, data: any, requesterId: string) {
    logger.info(`Creating message - orgId: ${orgId}, ticketId: ${ticketId}, requesterId: ${requesterId}`)
    
    const requester = await this.prisma.user.findFirst({
      where: {
        id: requesterId,
        orgId,
      },
    })

    if (!requester) {
      logger.error(`Requester not found - id: ${requesterId}, orgId: ${orgId}`)
      throw new Error("User not found")
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        orgId,
      },
      include: {
        channel: true,
      },
    })

    if (!ticket) {
      logger.error(`Ticket not found - id: ${ticketId}, orgId: ${orgId}`)
      
      // Try to find ticket without orgId constraint to debug
      const ticketAnyOrg = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { channel: true }
      })
      
      if (ticketAnyOrg) {
        logger.error(`Ticket exists but in different org - ticketOrgId: ${ticketAnyOrg.orgId}, requestedOrgId: ${orgId}`)
      } else {
        logger.error(`Ticket does not exist at all - ticketId: ${ticketId}`)
      }
      
      throw new Error("Ticket not found")
    }
    
    logger.info(`Ticket found - id: ${ticket.id}, orgId: ${ticket.orgId}, channelId: ${ticket.channelId}`)

    const message = await this.prisma.message.create({
      data: {
        id: `msg-${uuid()}`,
        ticketId,
        orgId,
        channelId: ticket.channelId,
        direction: "OUTBOUND",
        senderUserId: requesterId,
        senderName: requester.name,
        content: data.content,
        metadata: data.metadata || {},
      },
    })

    await this.outboundQueue.add(
      "send-message",
      {
        messageId: message.id,
        ticketId,
        channelId: ticket.channelId,
        content: data.content,
        externalThreadId: ticket.externalThreadId,
      },
      {
        priority: 1,
        removeOnComplete: true,
      },
    )

    if (ticket.status === "CLOSED") {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "OPEN" },
      })
    }

    logger.info(`Message sent: ${message.id} in ticket: ${ticketId}`)
    return message
  }

  async createInboundMessage(orgId: string, ticketId: string, data: any) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        orgId,
      },
      include: {
        channel: true,
        customer: true
      }
    })

    // Create or update customer
    let customer = ticket.customer
    if (!customer && ticket.channel) {
      customer = await this.customersService.findOrCreateCustomer(
        orgId,
        ticket.channel.type,
        ticket.externalThreadId,
        data.senderName
      )
      
      // Link customer to ticket
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { customerId: customer.id }
      })
    }

    const message = await this.prisma.message.create({
      data: {
        id: `msg-${uuid()}`,
        ticketId,
        orgId,
        channelId: ticket.channelId,
        direction: "INBOUND",
        externalMessageId: data.externalMessageId,
        senderName: data.senderName,
        content: data.content,
        metadata: data.metadata || {},
        createdAt: data.timestamp || new Date(),
      },
    })

    // Update customer last message
    if (customer) {
      await this.customersService.updateCustomerLastMessage(customer.id, data.content)
    }

    // Create notification
    const notificationType = data.messageType === 'comment' ? NotificationType.NEW_COMMENT : NotificationType.NEW_MESSAGE
    await this.notificationsService.createNotification(
      orgId,
      notificationType,
      `New ${data.messageType || 'message'} from ${data.senderName}`,
      data.content,
      {
        ticketId,
        customerId: customer?.id,
        platform: ticket.channel?.type
      }
    )

    if (ticket.status === "CLOSED") {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "PENDING" },
      })
    }

    logger.info(`Inbound message created: ${message.id} in ticket: ${ticketId}`)
    return message
  }

  async findOrCreateTicket(orgId: string, channelId: string, externalThreadId: string, senderName: string) {
    let ticket = await this.prisma.ticket.findFirst({
      where: {
        orgId,
        channelId,
        externalThreadId,
      },
    })

    if (!ticket) {
      ticket = await this.prisma.ticket.create({
        data: {
          orgId,
          channelId,
          externalThreadId,
          subject: `Message from ${senderName}`,
          status: "OPEN",
          priority: "MEDIUM",
        },
      })

      logger.info(`Auto-created ticket: ${ticket.id} for thread: ${externalThreadId}`)
    }

    return ticket
  }
}