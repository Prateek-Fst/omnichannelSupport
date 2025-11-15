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
    logger.info(`🔐 Webhook verification - channelId: ${channelId}, mode: ${mode}, verifyToken: ${verifyToken}`)
    
    if (mode === 'subscribe') {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
      })
      
      if (!channel) {
        logger.error(`❌ Channel not found: ${channelId}`)
        throw new BadRequestException("Channel not found")
      }
      
      const expectedToken = (channel.config as any).webhookVerifyToken
      logger.info(`🔑 Token comparison - received: ${verifyToken}, expected: ${expectedToken}, match: ${expectedToken === verifyToken}`)
      
      if (expectedToken === verifyToken) {
        logger.info(`✅ Webhook verified successfully for channel: ${channelId}`)
        return challenge
      } else {
        logger.warn(`❌ Invalid verify token for channel: ${channelId}`)
        throw new BadRequestException("Invalid verify token")
      }
    }
    
    logger.error(`❌ Invalid verification request - mode: ${mode}`)
    throw new BadRequestException("Invalid verification request")
  }

  @Post(":channelId")
  async handleWebhook(
    @Param('channelId') channelId: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    logger.info(`📨 Webhook received for channel: ${channelId} - headers: ${Object.keys(headers).join(',')}, bodyKeys: ${Object.keys(body || {}).join(',')}`)

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    })

    if (!channel) {
      logger.error(`❌ Channel not found: ${channelId}`)
      throw new BadRequestException("Channel not found")
    }

    logger.info(`📋 Channel found - type: ${channel.type}, orgId: ${channel.orgId}, isActive: ${channel.isActive}`)

    const connector = this.connectorFactory.getConnector(channel.type)

    // Verify webhook signature
    const signatureValid = connector.verifyWebhookSignature(headers, body)
    logger.info(`🔐 Signature verification - valid: ${signatureValid}, hasSignature: ${!!headers['x-hub-signature-256']}, hasAppSecret: ${!!(channel.config as any).appSecret}`)

    // In development, allow messages even with invalid signatures
    if (!signatureValid && process.env.NODE_ENV === 'production') {
      logger.warn(`❌ Invalid webhook signature for channel: ${channelId}`)
      throw new BadRequestException("Invalid signature")
    } else if (!signatureValid) {
      logger.warn(`⚠️ Invalid signature but allowing in development mode`)
    }

    // Parse webhook
    try {
      logger.info(`🔄 Parsing webhook message...`)
      const parsedMessage = await connector.parseIncomingWebhook(body)
      
      logger.info(`✅ Message parsed - sender: ${parsedMessage.senderName}, content: ${parsedMessage.content?.substring(0, 50)}..., type: ${parsedMessage.messageType}`)

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

      logger.info(`🚀 Message queued for processing from channel: ${channelId}`)
      return { ok: true }
    } catch (err) {
      logger.error(`❌ Failed to parse webhook: ${err.message}`)
      throw new BadRequestException("Failed to parse webhook")
    }
  }
}
