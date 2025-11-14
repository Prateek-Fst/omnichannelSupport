import { Worker } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { ConnectorFactory } from "../connectors/connector.factory"
import { logger } from "../common/logger"
import Redis from "ioredis"

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()
const connectorFactory = new ConnectorFactory()

const BATCH_SIZE = 10 // Send 10 messages at a time
const BATCH_DELAY = 1000 // 1 second delay between batches

async function processCampaign(job) {
  try {
    logger.info(`Processing campaign: ${job.id}`)

    const { campaignId, orgId } = job.data

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        channel: true,
        recipients: {
          where: { status: "PENDING" },
          take: BATCH_SIZE,
        },
      },
    })

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    if (!campaign.channel) {
      throw new Error(`Channel not found for campaign: ${campaignId}`)
    }

    const connector = connectorFactory.getConnector(campaign.channel.type)

    // Send messages to recipients
    for (const recipient of campaign.recipients) {
      try {
        const result = await connector.sendMessage({
          ticketId: `campaign-${campaignId}`,
          externalThreadId: recipient.recipientContact,
          content: campaign.messageTemplate,
          senderName: campaign.channel.name,
        })

        if (result.success) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
            },
          })

          logger.info(`Campaign message sent to: ${recipient.recipientContact}`)
        } else {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "FAILED",
              error: result.error,
            },
          })

          logger.error(`Campaign message failed to: ${recipient.recipientContact} - ${result.error}`)
        }
      } catch (err) {
        logger.error(`Error sending campaign message to ${recipient.recipientContact}: ${err}`)

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            error: err.message,
          },
        })
      }

      // Add delay between messages (rate limiting)
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY / BATCH_SIZE))
    }

    // Check if there are more recipients to process
    const remainingCount = await prisma.campaignRecipient.count({
      where: {
        campaignId,
        status: "PENDING",
      },
    })

    if (remainingCount > 0) {
      // Re-queue for next batch
      await job.queue.add("send-campaign", { campaignId, orgId }, { priority: 1 })
    } else {
      // Campaign complete
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      })

      logger.info(`Campaign completed: ${campaignId}`)
    }

    return { success: true, processed: campaign.recipients.length }
  } catch (err) {
    logger.error(`Error processing campaign: ${err.message}`)
    throw err
  }
}

// Create and start worker
const worker = new Worker("campaigns", processCampaign, {
  connection: redis,
})

worker.on("completed", (job) => {
  logger.info(`Campaign job completed: ${job.id}`)
})

worker.on("failed", (job, err) => {
  logger.error(`Campaign job failed: ${job.id} - ${err.message}`)
})

logger.info("Campaign worker started")

process.on("SIGTERM", async () => {
  logger.info("Shutting down campaign worker")
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})
