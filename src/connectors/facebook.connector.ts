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
    if (!config.pageId || !config.accessToken) {
      throw new Error("Facebook requires pageId and accessToken")
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    const signature = headers["x-hub-signature-256"]
    if (!signature || !this.config.appSecret) return true // Mock mode
    
    const bodyString = typeof body === "string" ? body : JSON.stringify(body)
    const hash = crypto.createHmac("sha256", this.config.appSecret).update(bodyString).digest("hex")
    return signature === `sha256=${hash}`
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info("FacebookConnector: Parsing webhook")

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
    
    // Handle different Facebook webhook types
    if (entry?.messaging) {
      // Messenger messages
      const messaging = entry.messaging[0]
      
      let content = ""
      let mediaUrls: string[] = []
      
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

      return {
        externalMessageId: messaging.message?.mid || uuid(),
        externalThreadId: messaging.sender.id,
        senderName: messaging.sender.id,
        content,
        timestamp: new Date(messaging.timestamp),
        messageType: 'message',
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        metadata: { 
          platform: "facebook", 
          type: messaging.message?.attachments?.[0]?.type || 'text'
        },
      }
    }
    
    // Handle feed comments/posts
    if (entry?.changes) {
      const change = entry.changes[0]
      
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

    throw new Error("Invalid Facebook webhook structure")
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    try {
      logger.info(`FacebookConnector: Sending message to ${outbound.externalThreadId}`)

      // Mock success for now - replace with real API call
      return {
        success: true,
        externalMessageId: `fb-msg-${uuid()}`,
      }
    } catch (err) {
      logger.error("Facebook send failed: " + err.message)
      return { success: false, error: err.message }
    }
  }
}
