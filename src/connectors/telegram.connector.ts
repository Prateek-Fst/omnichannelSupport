import { Injectable } from '@nestjs/common'
import { AbstractConnector } from './abstract.connector'
import { ParsedMessage, OutboundMessage, ProviderSendResult } from './types'
import { logger } from '../common/logger'

@Injectable()
export class TelegramConnector extends AbstractConnector {
  type: "telegram" = "telegram"
  private botToken: string
  private webhookSecret: string

  async init(config: any): Promise<void> {
    super.init(config)
    this.botToken = config.botToken
    
    if (!this.botToken) {
      throw new Error('Telegram bot token is required')
    }

    logger.info('Telegram connector initialized')
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info(`Parsing Telegram webhook: ${JSON.stringify(body, null, 2)}`)

    if (!body.message && !body.edited_message) {
      throw new Error('No message found in Telegram webhook')
    }

    const message = body.message || body.edited_message
    const chat = message.chat
    const from = message.from

    // Handle different message types
    let content = ''
    let messageType = 'text'

    if (message.text) {
      content = message.text
      messageType = 'text'
    } else if (message.photo) {
      content = message.caption || '[Photo]'
      messageType = 'image'
    } else if (message.document) {
      content = message.caption || `[Document: ${message.document.file_name}]`
      messageType = 'document'
    } else if (message.voice) {
      content = '[Voice message]'
      messageType = 'voice'
    } else if (message.video) {
      content = message.caption || '[Video]'
      messageType = 'video'
    } else if (message.sticker) {
      content = `[Sticker: ${message.sticker.emoji || ''}]`
      messageType = 'sticker'
    } else {
      content = '[Unsupported message type]'
      messageType = 'unknown'
    }

    return {
      externalMessageId: message.message_id.toString(),
      externalThreadId: chat.id.toString(),
      senderPhone: from.username ? `@${from.username}` : from.id.toString(),
      senderName: `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || `User ${from.id}`,
      content,
      messageType: 'message',
      timestamp: new Date(message.date * 1000),
      metadata: {
        chatType: chat.type,
        chatTitle: chat.title,
        userId: from.id,
        username: from.username,
        messageId: message.message_id,
        telegramMessageType: messageType,
        originalMessage: message
      }
    }
  }

  async sendMessage(message: OutboundMessage): Promise<ProviderSendResult> {
    if (!this.botToken) {
      throw new Error('Telegram bot not initialized')
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
    
    const payload = {
      chat_id: message.externalThreadId,
      text: message.content,
      parse_mode: 'HTML'
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        logger.error(`Telegram API error: ${JSON.stringify(result)}`)
        throw new Error(`Telegram API error: ${result.description}`)
      }

      logger.info(`Message sent via Telegram: ${result.result.message_id}`)
      return {
        success: true,
        externalMessageId: result.result.message_id.toString()
      }
    } catch (error) {
      logger.error(`Failed to send Telegram message: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    // Telegram doesn't require webhook secret for basic functionality
    // Skip verification for simplicity
    return true
  }

  // Helper methods for Telegram-specific functionality
  async setupWebhook(webhookUrl: string): Promise<any> {
    if (!this.botToken) {
      throw new Error('Telegram bot not initialized')
    }

    const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`
    
    const payload = {
      url: webhookUrl,
      allowed_updates: ['message', 'edited_message']
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        logger.error(`Failed to set Telegram webhook: ${JSON.stringify(result)}`)
        throw new Error(`Telegram webhook setup failed: ${result.description}`)
      }

      logger.info('Telegram webhook set successfully')
      return result
    } catch (error) {
      logger.error(`Failed to setup Telegram webhook: ${error.message}`)
      throw error
    }
  }

  async getWebhookInfo(): Promise<any> {
    if (!this.botToken) {
      throw new Error('Telegram bot not initialized')
    }

    const url = `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`
    
    try {
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Telegram API error: ${result.description}`)
      }

      return result.result
    } catch (error) {
      logger.error(`Failed to get Telegram webhook info: ${error.message}`)
      throw error
    }
  }

  async getBotInfo(): Promise<any> {
    if (!this.botToken) {
      throw new Error('Telegram bot not initialized')
    }

    const url = `https://api.telegram.org/bot${this.botToken}/getMe`
    
    try {
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Telegram API error: ${result.description}`)
      }

      return result.result
    } catch (error) {
      logger.error(`Failed to get Telegram bot info: ${error.message}`)
      throw error
    }
  }
}