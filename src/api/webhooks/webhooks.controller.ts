import { Controller, Get, Post, Body, Param, Headers, Query, BadRequestException, Inject } from "@nestjs/common"
import { Queue } from "bull"
import { PrismaService } from "../../common/prisma/prisma.service"
import { ConnectorFactory } from "../../connectors/connector.factory"
import { logger } from "../../common/logger"

@Controller("webhook")
export class WebhooksController {

  constructor(
    @Inject('BullQueue_inbound') private readonly inboundQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  @Get(":channelId")
  async verifyWebhook(
    @Param('channelId') channelId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    logger.info(`Webhook verification for channel: ${channelId}`)
    
    if (mode === 'subscribe') {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
      })
      
      if (channel && (channel.config as any).webhookVerifyToken === verifyToken) {
        logger.info(`Webhook verified successfully for channel: ${channelId}`)
        return challenge
      } else {
        logger.warn(`Invalid verify token for channel: ${channelId}`)
        throw new BadRequestException("Invalid verify token")
      }
    }
    
    throw new BadRequestException("Invalid verification request")
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
