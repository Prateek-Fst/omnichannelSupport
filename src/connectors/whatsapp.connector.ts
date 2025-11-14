import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"
import * as crypto from "crypto"
import { v4 as uuid } from "uuid"

export class WhatsAppConnector extends AbstractConnector {
  type = "whatsapp" as const
  private apiUrl = "https://graph.facebook.com/v18.0"

  async init(config: Record<string, any>): Promise<void> {
    await super.init(config)
    if (!config.phoneNumberId || !config.accessToken) {
      throw new Error("WhatsApp requires phoneNumberId and accessToken")
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    const signature = headers["x-hub-signature-256"]

    if (!signature) {
      logger.warn("Missing webhook signature header")
      return false
    }

    const appSecret = this.config.appSecret
    if (!appSecret) {
      logger.warn("Missing app secret for signature verification")
      return false
    }

    const bodyString = typeof body === "string" ? body : JSON.stringify(body)
    const hash = crypto.createHmac("sha256", appSecret).update(bodyString).digest("hex")

    const expectedSignature = `sha256=${hash}`

    return signature === expectedSignature
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info("WhatsAppConnector: Parsing webhook")

    try {
      // Handle mock format first
      if (body.senderPhone && body.message) {
        return {
          externalMessageId: body.messageId || `wa-${Date.now()}`,
          externalThreadId: body.senderPhone,
          senderName: body.senderName || body.senderPhone,
          senderPhone: body.senderPhone,
          content: body.message,
          timestamp: new Date(),
          messageType: 'message',
          metadata: body.metadata || { platform: "whatsapp" },
        }
      }

      // Real WhatsApp webhook format
      const entry = body.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value

      const message = value?.messages?.[0]
      const contact = value?.contacts?.[0]

      if (!message || !contact) {
        throw new Error("Invalid WhatsApp webhook structure")
      }

      let content = ""
      let mediaUrls: string[] = []

      // Handle different message types
      switch (message.type) {
        case 'text':
          content = message.text?.body || ""
          break
        case 'image':
          content = message.image?.caption || "[Image]"
          mediaUrls = [message.image?.id]
          break
        case 'video':
          content = message.video?.caption || "[Video]"
          mediaUrls = [message.video?.id]
          break
        case 'document':
          content = message.document?.caption || `[Document: ${message.document?.filename}]`
          mediaUrls = [message.document?.id]
          break
        case 'audio':
          content = "[Audio Message]"
          mediaUrls = [message.audio?.id]
          break
        default:
          content = `[${message.type} message]`
      }

      return {
        externalMessageId: message.id,
        externalThreadId: message.from,
        senderName: contact.profile?.name || contact.wa_id,
        senderPhone: contact.wa_id,
        content,
        timestamp: new Date(Number.parseInt(message.timestamp) * 1000),
        messageType: 'message',
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        metadata: {
          type: message.type,
          status: message.status,
          platform: "whatsapp"
        },
      }
    } catch (err) {
      logger.error("Failed to parse WhatsApp webhook: " + err.message)
      throw err
    }
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    try {
      logger.info(`WhatsAppConnector: Sending message to ${outbound.externalThreadId}`)

      // In production, this would call the actual WhatsApp API
      // const response = await fetch(
      //   `${this.apiUrl}/${this.config.phoneNumberId}/messages`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       Authorization: `Bearer ${this.config.accessToken}`,
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       messaging_product: 'whatsapp',
      //       to: outbound.externalThreadId,
      //       type: 'text',
      //       text: { body: outbound.content },
      //     }),
      //   },
      // );
      // const data = await response.json();
      // return { success: response.ok, externalMessageId: data.messages?.[0]?.id };

      // Mock success for now
      return {
        success: true,
        externalMessageId: `wha-msg-${uuid()}`,
      }
    } catch (err) {
      logger.error("WhatsApp send failed: " + err.message)
      return { success: false, error: err.message }
    }
  }
}
