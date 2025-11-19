import { Controller, Post, Body, Param, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Queue } from 'bull'
import { PrismaService } from '../../common/prisma/prisma.service'
import { ConnectorFactory } from '../../connectors/connector.factory'
import { logger } from '../../common/logger'

@ApiTags('email-test')
@Controller('email-test')
export class EmailTestController {
  constructor(
    @Inject('BullQueue_inbound') private readonly inboundQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  @Post(':channelId/simulate')
  async simulateEmailWebhook(
    @Param('channelId') channelId: string,
    @Body() emailData: {
      from: string
      fromName?: string
      subject: string
      text: string
      html?: string
      date?: string
    }
  ) {
    logger.info(`📧 Simulating email webhook for channel: ${channelId}`)
    
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    })

    if (!channel) {
      throw new Error('Channel not found')
    }

    const connector = this.connectorFactory.getConnector(channel.type)
    
    // Convert email data to webhook format
    const webhookBody = {
      messageId: `email-${Date.now()}`,
      from: emailData.from,
      fromName: emailData.fromName || emailData.from,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      date: emailData.date || new Date().toISOString(),
      threadId: emailData.subject // Use subject as thread ID for email
    }

    // Parse webhook using connector
    const parsedMessage = await connector.parseIncomingWebhook(webhookBody)
    
    // Queue for processing
    await this.inboundQueue.add(
      'process-message',
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

    logger.info(`🚀 Email simulation queued for processing from channel: ${channelId}`)
    return { ok: true }
  }
}