import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"
import { v4 as uuid } from "uuid"
import * as crypto from "crypto"

export class LinkedInConnector extends AbstractConnector {
  type = "linkedin" as const
  private apiUrl = "https://api.linkedin.com/v2"

  async init(config: Record<string, any>): Promise<void> {
    await super.init(config)
    if (!config.clientId || !config.clientSecret) {
      throw new Error("LinkedIn requires clientId and clientSecret")
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    const signature = headers["x-linkedin-signature"]
    if (!signature || !this.config.webhookSecret) return true // Mock mode
    
    const bodyString = typeof body === "string" ? body : JSON.stringify(body)
    const hash = crypto.createHmac("sha256", this.config.webhookSecret).update(bodyString).digest("hex")
    return signature === hash
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info("LinkedInConnector: Parsing webhook")

    // Handle both real LinkedIn webhook and mock format
    if (body.senderPhone && body.message) {
      // Mock format
      return {
        externalMessageId: body.messageId || uuid(),
        externalThreadId: `li-${body.senderPhone}`,
        senderName: body.senderName || body.senderPhone,
        senderPhone: body.senderPhone,
        content: body.message,
        timestamp: new Date(),
        metadata: body.metadata || { platform: "linkedin" },
      }
    }

    // Real LinkedIn webhook format (Messages)
    const messageEvent = body.data
    
    if (!messageEvent) {
      throw new Error("Invalid LinkedIn webhook structure")
    }

    return {
      externalMessageId: messageEvent.id || uuid(),
      externalThreadId: messageEvent.from?.id || messageEvent.conversationId,
      senderName: messageEvent.from?.displayName || messageEvent.from?.id,
      content: messageEvent.text || messageEvent.content?.text || "",
      timestamp: new Date(messageEvent.createdAt || Date.now()),
      metadata: { platform: "linkedin", conversationId: messageEvent.conversationId },
    }
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    try {
      logger.info(`LinkedInConnector: Sending message to ${outbound.externalThreadId}`)

      // Mock success for now - replace with real API call
      return {
        success: true,
        externalMessageId: `li-msg-${uuid()}`,
      }
    } catch (err) {
      logger.error("LinkedIn send failed: " + err.message)
      return { success: false, error: err.message }
    }
  }
}
