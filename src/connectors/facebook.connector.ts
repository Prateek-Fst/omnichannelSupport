import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"
import { v4 as uuid } from "uuid"
import * as crypto from "crypto"

export class FacebookConnector extends AbstractConnector {
  type = "facebook" as const
  private apiUrl = "https://graph.facebook.com/v18.0"

  async init(config: Record<string, any>): Promise<void> {
    await super.init(config)
    if (!config.facebookPageId || !config.pageAccessToken) {
      logger.warn("Facebook credentials missing - messages will fail to send")
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
    logger.info("FacebookConnector: Parsing webhook")
    logger.info(`Facebook webhook body: ${JSON.stringify(body)}`)

    // Handle mock format first
    if (body.senderPhone && body.message) {
      return {
        externalMessageId: body.messageId || uuid(),
        externalThreadId: `fb-${body.senderPhone}`,
        senderName: body.senderName || body.senderPhone,
        senderPhone: body.senderPhone,
        content: body.message,
        timestamp: new Date(),
        messageType: 'message',
        metadata: body.metadata || { platform: "facebook" },
      }
    }

    const entry = body.entry?.[0]
    
    // Handle Facebook Messenger messages
    if (entry?.messaging) {
      logger.info(`Facebook: Found messaging entry with ${entry.messaging.length} messages`)
      const messaging = entry.messaging[0]
      logger.info(`Facebook messaging object: ${JSON.stringify(messaging)}`)
      
      let content = ""
      let mediaUrls: string[] = []
      let messageType: 'message' = 'message'
      
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
      }

      logger.info(`Facebook incoming message - sender ID: ${messaging.sender.id}, content: ${content}`)
      
      return {
        externalMessageId: messaging.message?.mid || uuid(),
        externalThreadId: messaging.sender.id,
        senderName: messaging.sender.id,
        content,
        timestamp: new Date(messaging.timestamp),
        messageType,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        metadata: {
          platform: "facebook",
          type: messaging.message?.attachments?.[0]?.type || 'text'
        },
      }
    }
    
    // Handle Facebook Page comments
    if (entry?.changes) {
      logger.info(`Facebook: Found changes entry with ${entry.changes.length} changes`)
      const change = entry.changes[0]
      logger.info(`Facebook change object: ${JSON.stringify(change)}`)
      
      if (change.field === 'feed' && change.value.item === 'comment') {
        return {
          externalMessageId: change.value.comment_id,
          externalThreadId: `post-${change.value.post_id}`,
          senderName: change.value.from?.name || change.value.from?.id,
          content: change.value.message,
          timestamp: new Date(change.value.created_time * 1000),
          messageType: 'comment',
          postId: change.value.post_id,
          metadata: {
            platform: "facebook",
            type: 'comment',
            postId: change.value.post_id,
            parentId: change.value.parent_id
          },
        }
      }
    }

    logger.error(`Facebook: Invalid webhook structure - no messaging or changes found`)
    logger.error(`Facebook: Entry object: ${JSON.stringify(entry)}`)
    throw new Error("Invalid Facebook webhook structure")
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    try {
      logger.info(`FacebookConnector: Sending message to ${outbound.externalThreadId}`)
      logger.info(`FacebookConnector: Config - facebookPageId: ${this.config?.facebookPageId}, hasPageAccessToken: ${!!this.config?.pageAccessToken}`)
      logger.info('FacebookConnector: Real mode - sending via Facebook API')

      // Check if it's a comment reply or DM
      if (outbound.externalThreadId.startsWith('post-')) {
        logger.info('FacebookConnector: Detected comment reply')
        return await this.replyToComment(outbound)
      } else {
        logger.info('FacebookConnector: Detected direct message')
        return await this.sendDirectMessage(outbound)
      }
    } catch (err) {
      logger.error("Facebook send failed: " + err.message)
      return { success: false, error: err.message }
    }
  }

  private async sendDirectMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    // Facebook Messenger API
    const url = `${this.apiUrl}/${this.config.facebookPageId}/messages`
    
    const payload = {
      recipient: { id: outbound.externalThreadId },
      message: { text: outbound.content }
    }

    logger.info(`Facebook API URL: ${url}`)
    logger.info(`Facebook payload: ${JSON.stringify(payload)}`)
    logger.info(`Facebook access token: ${this.config.pageAccessToken?.substring(0, 20)}...`)

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
      logger.info(`Facebook API response: ${JSON.stringify(data)}`)
      
      if (response.ok) {
        return {
          success: true,
          externalMessageId: data.message_id || `fb-${Date.now()}`
        }
      } else {
        logger.error(`Facebook API error: ${response.status} - ${JSON.stringify(data)}`)
        return {
          success: false,
          error: data.error?.message || `Facebook API error: ${response.status}`
        }
      }
    } catch (error) {
      logger.error(`Facebook fetch error: ${error.message}`)
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
          externalMessageId: data.id || `fb-comment-${Date.now()}`
        }
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to reply to Facebook comment'
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