import { config } from 'dotenv'
import { Worker } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { logger } from "../common/logger"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"
import { ChannelType, NotificationType } from "@prisma/client"

config()

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()

async function processInboundMessage(job) {
  try {
    logger.info(`🔄 Processing inbound message: ${job.id} - channelId: ${job.data.channelId}, orgId: ${job.data.orgId}`)

    const { channelId, orgId, parsedMessage } = job.data

    // Get channel info
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      logger.error(`❌ Channel not found: ${channelId}`)
      throw new Error(`Channel not found: ${channelId}`)
    }

    logger.info(`📱 Channel found - type: ${channel.type}, orgId: ${channel.orgId}`)

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        orgId,
        platform: channel.type,
        externalId: parsedMessage.externalThreadId
      }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          orgId,
          platform: channel.type,
          externalId: parsedMessage.externalThreadId,
          name: parsedMessage.senderName,
          lastMessage: parsedMessage.content,
          lastMessageAt: parsedMessage.timestamp
        }
      })
      logger.info(`👤 Auto-created customer: ${customer.id} (${customer.platform}) - name: ${customer.name}, externalId: ${customer.externalId}`)
    } else {
      // Update customer last message
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          lastMessage: parsedMessage.content,
          lastMessageAt: parsedMessage.timestamp
        }
      })
      logger.info(`👤 Updated existing customer: ${customer.id}`)
    }

    // Find or create ticket
    let ticket = await prisma.ticket.findFirst({
      where: {
        channelId,
        externalThreadId: parsedMessage.externalThreadId,
        orgId,
      },
    })

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          orgId,
          channelId,
          customerId: customer.id,
          externalThreadId: parsedMessage.externalThreadId,
          subject: `Message from ${parsedMessage.senderName}`,
          status: "OPEN",
          priority: "MEDIUM",
        },
      })
      logger.info(`🎫 Auto-created ticket: ${ticket.id} - customerId: ${customer.id}, subject: ${ticket.subject}`)
    } else if (!ticket.customerId) {
      // Link existing ticket to customer
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { customerId: customer.id }
      })
      logger.info(`🎫 Linked existing ticket to customer: ${ticket.id}`)
    }

    // Create message
    await prisma.message.create({
      data: {
        id: `msg-${uuid()}`,
        ticketId: ticket.id,
        orgId,
        channelId,
        direction: "INBOUND",
        externalMessageId: parsedMessage.externalMessageId,
        senderName: parsedMessage.senderName,
        content: parsedMessage.content,
        metadata: parsedMessage.metadata,
        createdAt: parsedMessage.timestamp,
      },
    })

    // Create notification
    const notificationType = parsedMessage.messageType === 'comment' ? NotificationType.NEW_COMMENT : NotificationType.NEW_MESSAGE
    await prisma.notification.create({
      data: {
        orgId,
        type: notificationType,
        title: `New ${parsedMessage.messageType || 'message'} from ${parsedMessage.senderName}`,
        message: parsedMessage.content,
        data: {
          ticketId: ticket.id,
          customerId: customer.id,
          platform: channel.type,
          channelId
        }
      }
    })

    // Update ticket status
    if (ticket.status === "CLOSED") {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "PENDING" },
      })
    }

    logger.info(`✅ Inbound message processed successfully - customerId: ${customer.id}, ticketId: ${ticket.id}, platform: ${channel.type}`)
    return { success: true, ticketId: ticket.id, customerId: customer.id }
  } catch (err) {
    logger.error(`❌ Error processing inbound message ${job.id}: ${err.message}`)
    throw err
  }
}

// Create and start worker
const worker = new Worker("inbound", processInboundMessage, {
  connection: redis,
})

worker.on("completed", (job) => {
  logger.info(`Job completed: ${job.id}`)
})

worker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job.id} - ${err.message}`)
})

logger.info("Inbound worker started")

process.on("SIGTERM", async () => {
  logger.info("Shutting down inbound worker")
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})
