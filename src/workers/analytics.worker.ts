import { config } from 'dotenv'
import { Worker } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { logger } from "../common/logger"
import Redis from "ioredis"

config()

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
})

const prisma = new PrismaClient()

async function aggregateAnalytics(job) {
  try {
    logger.info(`Aggregating analytics for date: ${job.data.date}`)

    const date = new Date(job.data.date)
    date.setHours(0, 0, 0, 0)

    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all organisations
    const orgs = await prisma.organisation.findMany()

    for (const org of orgs) {
      // Get ticket stats
      const openCount = await prisma.ticket.count({
        where: {
          orgId: org.id,
          status: "OPEN",
          createdAt: {
            gte: date,
            lt: tomorrow,
          },
        },
      })

      const closedCount = await prisma.ticket.count({
        where: {
          orgId: org.id,
          status: "CLOSED",
          createdAt: {
            gte: date,
            lt: tomorrow,
          },
        },
      })

      // Calculate average response time
      const messages = await prisma.message.findMany({
        where: {
          orgId: org.id,
          direction: "INBOUND",
          createdAt: {
            gte: date,
            lt: tomorrow,
          },
        },
        include: {
          ticket: {
            include: {
              messages: {
                where: { direction: "OUTBOUND" },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          },
        },
      })

      let totalResponseTime = 0
      let count = 0

      for (const msg of messages) {
        if (msg.ticket.messages.length > 0) {
          const responseTime = msg.ticket.messages[0].createdAt.getTime() - msg.createdAt.getTime()
          totalResponseTime += responseTime
          count++
        }
      }

      const avgResponseTime = count > 0 ? Math.floor(totalResponseTime / count) : 0

      // Create or update statistics
      await prisma.ticketStatistics.upsert({
        where: {
          orgId_date: {
            orgId: org.id,
            date,
          },
        },
        create: {
          orgId: org.id,
          date,
          openCount,
          closedCount,
          avgResponseTime,
        },
        update: {
          openCount,
          closedCount,
          avgResponseTime,
        },
      })

      logger.info(
        `Analytics aggregated for org ${org.id}: open=${openCount}, closed=${closedCount}, avgTime=${avgResponseTime}`,
      )
    }

    return { success: true }
  } catch (err) {
    logger.error(`Error aggregating analytics: ${err.message}`)
    throw err
  }
}

// Create and start worker
const worker = new Worker("analytics", aggregateAnalytics, {
  connection: redis,
})

worker.on("completed", (job) => {
  logger.info(`Analytics job completed: ${job.id}`)
})

worker.on("failed", (job, err) => {
  logger.error(`Analytics job failed: ${job.id} - ${err.message}`)
})

logger.info("Analytics worker started")

process.on("SIGTERM", async () => {
  logger.info("Shutting down analytics worker")
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})
