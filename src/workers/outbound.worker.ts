import { config } from 'dotenv'
import { Worker } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { ConnectorFactory } from "../connectors/connector.factory"
import { logger } from "../common/logger"
import Redis from "ioredis"

config()

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()
const connectorFactory = new ConnectorFactory()

async function processOutboundMessage(job) {
  try {
    logger.info(`Sending outbound message: ${job.id}`)

    const { messageId, ticketId, channelId, externalThreadId, content, senderName } = job.data

    // Get channel
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    })

    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`)
    }

    // Get connector and initialize with channel config
    logger.info(`Channel config for ${channel.type}: ${JSON.stringify(channel.config)}`)
    const connector = connectorFactory.getConnector(channel.type)
    await connector.init((channel.config as Record<string, any>) || {})

    const result = await connector.sendMessage({
      ticketId,
      externalThreadId,
      content,
      senderName,
    })

    if (result.success) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          externalMessageId: result.externalMessageId,
          metadata: {
            sent: true,
            sentAt: new Date().toISOString(),
          },
        },
      })

      logger.info(`Message sent successfully: ${messageId}`)
    } else {
      logger.error(`Failed to send message: ${messageId} - ${result.error}`)
      await prisma.message.update({
        where: { id: messageId },
        data: {
          metadata: {
            error: result.error,
            failedAt: new Date().toISOString(),
          },
        },
      })
    }

    return { success: result.success }
  } catch (err) {
    logger.error(`Error processing outbound message: ${err.message}`)
    throw err
  }
}

// Create and start worker
const worker = new Worker("outbound", processOutboundMessage, {
  connection: redis,
})

worker.on("completed", (job) => {
  logger.info(`Job completed: ${job.id}`)
})

worker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job.id} - ${err.message}`)
})

logger.info("Outbound worker started")

process.on("SIGTERM", async () => {
  logger.info("Shutting down outbound worker")
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})
