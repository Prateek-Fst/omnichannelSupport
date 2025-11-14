import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"
import { v4 as uuid } from "uuid"
import * as crypto from "crypto"

export class TwitterConnector extends AbstractConnector {
  type = "twitter" as const
  private apiUrl = "https://api.twitter.com/2"

  async init(config: Record<string, any>): Promise<void> {
    await super.init(config)
    if (!config.apiKey || !config.apiSecret) {
      throw new Error("Twitter requires apiKey and apiSecret")
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    const signature = headers["x-twitter-webhooks-signature"]
    if (!signature || !this.config.webhookSecret) return true // Mock mode
    
    const bodyString = typeof body === "string" ? body : JSON.stringify(body)
    const hash = crypto.createHmac("sha256", this.config.webhookSecret).update(bodyString).digest("base64")
    return signature === `sha256=${hash}`
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info("TwitterConnector: Parsing webhook")

    // Handle both real Twitter webhook and mock format
    if (body.senderPhone && body.message) {
      // Mock format
      return {
        externalMessageId: body.messageId || uuid(),
        externalThreadId: `tw-${body.senderPhone}`,
        senderName: body.senderName || body.senderPhone,
        senderPhone: body.senderPhone,
        content: body.message,
        timestamp: new Date(),
        metadata: body.metadata || { platform: "twitter" },
      }
    }

    // Real Twitter webhook format (Direct Messages)
    const dmEvent = body.direct_message_events?.[0]
    const users = body.users
    
    if (!dmEvent || !users) {
      throw new Error("Invalid Twitter webhook structure")
    }

    const senderId = dmEvent.message_create.sender_id
    const senderInfo = users[senderId]

    return {
      externalMessageId: dmEvent.id,
      externalThreadId: senderId,
      senderName: senderInfo?.name || senderInfo?.screen_name || senderId,
      content: dmEvent.message_create.message_data.text,
      timestamp: new Date(Number.parseInt(dmEvent.created_timestamp)),
      metadata: { platform: "twitter", screen_name: senderInfo?.screen_name },
    }
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    try {
      logger.info(`TwitterConnector: Sending message to ${outbound.externalThreadId}`)

      // Mock success for now - replace with real API call
      return {
        success: true,
        externalMessageId: `tw-msg-${uuid()}`,
      }
    } catch (err) {
      logger.error("Twitter send failed: " + err.message)
      return { success: false, error: err.message }
    }
  }
}
