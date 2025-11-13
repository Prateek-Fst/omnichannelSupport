import { Worker } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { logger } from "../common/logger"
import Redis from "ioredis"
import { v4 as uuid } from "uuid"

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
})

const prisma = new PrismaClient()

async function processInboundMessage(job) {
  try {
    logger.info(`Processing inbound message: ${job.id}`)

    const { channelId, orgId, parsedMessage } = job.data

    // Find or create ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        channelId,
        externalThreadId: parsedMessage.externalThreadId,
        orgId,
      },
    })

    let ticketId = ticket?.id

    if (!ticketId) {
      const newTicket = await prisma.ticket.create({
        data: {
          orgId,
          channelId,
          externalThreadId: parsedMessage.externalThreadId,
          subject: `Message from ${parsedMessage.senderName}`,
          status: "OPEN",
          priority: "MEDIUM",
        },
      })

      ticketId = newTicket.id
      logger.info(`Auto-created ticket: ${ticketId}`)
    }

    // Create message
    await prisma.message.create({
      data: {
        id: `msg-${uuid()}`,
        ticketId,
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

    // Update ticket to PENDING if OPEN
    if (!ticket || ticket.status === "OPEN") {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "PENDING" },
      })
    }

    logger.info(`Inbound message processed: ticket=${ticketId}`)
    return { success: true, ticketId }
  } catch (err) {
    logger.error(`Error processing inbound message: ${err.message}`)
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
