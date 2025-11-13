import { Controller, Post, Body, Param, Headers, BadRequestException } from "@nestjs/common"
import type { Queue } from "bull"
import type { PrismaService } from "../../common/prisma/prisma.service"
import type { ConnectorFactory } from "../../connectors/connector.factory"
import { logger } from "../../common/logger"

@Controller("webhook")
export class WebhooksController {
  private inboundQueue: Queue
  private prisma: PrismaService
  private connectorFactory: ConnectorFactory

  constructor(inboundQueue: Queue, prisma: PrismaService, connectorFactory: ConnectorFactory) {
    this.inboundQueue = inboundQueue
    this.prisma = prisma
    this.connectorFactory = connectorFactory
  }

  @Post(":channelId")
  async handleWebhook(
    @Param('channelId') channelId: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    logger.info(`Webhook received for channel: ${channelId}`)

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    })

    if (!channel) {
      throw new BadRequestException("Channel not found")
    }

    const connector = this.connectorFactory.getConnector(channel.type)

    // Verify webhook signature
    if (!connector.verifyWebhookSignature(headers, body)) {
      logger.warn(`Invalid webhook signature for channel: ${channelId}`)
      throw new BadRequestException("Invalid signature")
    }

    // Parse webhook
    try {
      const parsedMessage = await connector.parseIncomingWebhook(body)

      // Queue for processing
      await this.inboundQueue.add(
        "process-message",
        {
          channelId,
          orgId: channel.orgId,
          parsedMessage,
        },
        {
          priority: 1,
          removeOnComplete: true,
        },
      )

      logger.info(`Message queued for processing from channel: ${channelId}`)
      return { ok: true }
    } catch (err) {
      logger.error(`Failed to parse webhook: ${err.message}`)
      throw new BadRequestException("Failed to parse webhook")
    }
  }
}
