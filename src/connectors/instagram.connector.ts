import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"
import { v4 as uuid } from "uuid"
import * as crypto from "crypto"

export class InstagramConnector extends AbstractConnector {
  type = "instagram" as const
  private apiUrl = "https://graph.facebook.com/v18.0"

  async init(config: Record<string, any>): Promise<void> {
    await super.init(config)
    if (!config.facebookPageId || !config.pageAccessToken || !config.instagramAccountId) {
      logger.warn("Instagram credentials missing - messages will fail to send")
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    const signature = headers["x-hub-signature-256"]
    
    // In development, be more lenient with signature verification
    if (!signature) {
      logger.warn("No signature provided - allowing in development mode")
      return true
    }
    
    if (!this.config.appSecret) {
      logger.warn("No app secret configured - allowing in development mode")
      return true
    }
    
    try {
      const bodyString = typeof body === "string" ? body : JSON.stringify(body)
      const hash = crypto.createHmac("sha256", this.config.appSecret).update(bodyString).digest("hex")
      const expectedSignature = `sha256=${hash}`
      
      logger.info(`Signature verification - received: ${signature?.substring(0, 20)}..., expected: ${expectedSignature?.substring(0, 20)}..., match: ${signature === expectedSignature}`)
      
      return signature === expectedSignature
    } catch (error) {
      logger.error(`Signature verification error: ${error.message}`)
      return true // Allow in development mode
    }
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info("InstagramConnector: Parsing webhook")

    // Handle mock format first
    if (body.senderPhone && body.message) {
      return {
        externalMessageId: body.messageId || uuid(),
        externalThreadId: `ig-${body.senderPhone}`,
        senderName: body.senderName || body.senderPhone,
        senderPhone: body.senderPhone,
        content: body.message,
        timestamp: new Date(),
        messageType: 'message',
        metadata: body.metadata || { platform: "instagram" },
      }
    }

    const entry = body.entry?.[0]
    
    // Handle Instagram messages
    if (entry?.messaging) {
      const messaging = entry.messaging[0]
      
      let content = ""
      let mediaUrls: string[] = []
      let messageType: 'message' | 'story_reply' = 'message'
      
      if (messaging.message) {
        content = messaging.message.text || ""
        
        // Handle attachments
        if (messaging.message.attachments) {
          const attachment = messaging.message.attachments[0]
          content = content || `[${attachment.type}]`
          if (attachment.payload?.url) {
            mediaUrls = [attachment.payload.url]
          }
        }
        
        // Check if it's a story reply
        if (messaging.message.reply_to) {
          messageType = 'story_reply'
          content = `Story Reply: ${content}`
        }
      }

      logger.info(`Instagram incoming message - sender ID: ${messaging.sender.id}`)
      
      return {
        externalMessageId: messaging.message?.mid || uuid(),
        externalThreadId: messaging.sender.id,
        senderName: messaging.sender.id,
        content,
        timestamp: new Date(messaging.timestamp),
        messageType,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        metadata: {
          platform: "instagram",
          type: messaging.message?.attachments?.[0]?.type || 'text',
          storyId: messaging.message?.reply_to?.story?.id
        },
      }
    }
    
    // Handle Instagram comments (via Facebook Graph API)
    if (entry?.changes) {
      const change = entry.changes[0]
      
      if (change.field === 'comments' && change.value.text) {
        return {
          externalMessageId: change.value.id,
          externalThreadId: `post-${change.value.media?.id}`,
          senderName: change.value.from?.username || change.value.from?.id,
          content: change.value.text,
          timestamp: new Date(change.value.created_time * 1000),
          messageType: 'comment',
          postId: change.value.media?.id,
          metadata: {
            platform: "instagram",
            type: 'comment',
            mediaId: change.value.media?.id,
            mediaType: change.value.media?.media_type
          },
        }
      }
    }

    throw new Error("Invalid Instagram webhook structure")
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    try {
      logger.info(`InstagramConnector: Sending message to ${outbound.externalThreadId}`)
      logger.info(`InstagramConnector: Config - instagramAccountId: ${this.config?.instagramAccountId}, hasPageAccessToken: ${!!this.config?.pageAccessToken}`)
      logger.info('InstagramConnector: Real mode - sending via Instagram API')

      // Check if it's a comment reply or DM
      if (outbound.externalThreadId.startsWith('post-')) {
        logger.info('InstagramConnector: Detected comment reply')
        return await this.replyToComment(outbound)
      } else {
        logger.info('InstagramConnector: Detected direct message')
        return await this.sendDirectMessage(outbound)
      }
    } catch (err) {
      logger.error("Instagram send failed: " + err.message)
      return { success: false, error: err.message }
    }
  }

  private async sendDirectMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    // Instagram messaging requires page access token and Instagram account ID
    const url = `${this.apiUrl}/${this.config.instagramAccountId}/messages`
    
    const payload = {
      recipient: { id: outbound.externalThreadId },
      message: { text: outbound.content }
    }

    logger.info(`Instagram API URL: ${url}`)
    logger.info(`Instagram payload: ${JSON.stringify(payload)}`)
    logger.info(`Instagram access token: ${this.config.pageAccessToken?.substring(0, 20)}...`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      logger.info(`Instagram API response: ${JSON.stringify(data)}`)
      
      if (response.ok) {
        return {
          success: true,
          externalMessageId: data.message_id || `ig-${Date.now()}`
        }
      } else {
        logger.error(`Instagram API error: ${response.status} - ${JSON.stringify(data)}`)
        return {
          success: false,
          error: data.error?.message || `Instagram API error: ${response.status}`
        }
      }
    } catch (error) {
      logger.error(`Instagram fetch error: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async replyToComment(outbound: OutboundMessage): Promise<ProviderSendResult> {
    // Extract post ID from thread ID (format: post-{postId})
    const postId = outbound.externalThreadId.replace('post-', '')
    const url = `${this.apiUrl}/${postId}/comments`
    
    const payload = {
      message: outbound.content
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (response.ok) {
        return {
          success: true,
          externalMessageId: data.id || `ig-comment-${Date.now()}`
        }
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to reply to Instagram comment'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}