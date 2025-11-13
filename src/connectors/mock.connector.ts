import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"
import { v4 as uuid } from "uuid"

export class MockConnector extends AbstractConnector {
  type = "mock" as const

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    // Mock always verifies successfully
    return true
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    logger.info("MockConnector: Parsing incoming webhook")

    if (!body.senderPhone || !body.message) {
      throw new Error("Invalid mock webhook payload")
    }

    return {
      externalMessageId: body.messageId || uuid(),
      externalThreadId: `mock-thread-${body.senderPhone}`,
      senderName: body.senderName || body.senderPhone,
      senderPhone: body.senderPhone,
      content: body.message,
      timestamp: new Date(),
      metadata: body.metadata || {},
    }
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    logger.info(`MockConnector: Sending message to ${outbound.externalThreadId}`)

    // Simulate successful send
    return {
      success: true,
      externalMessageId: `mock-msg-${uuid()}`,
    }
  }
}
