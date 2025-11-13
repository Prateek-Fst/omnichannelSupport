import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"

export class InstagramConnector extends AbstractConnector {
  type = "instagram" as const

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    logger.warn("Instagram webhook signature verification not implemented")
    return true
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    throw new Error("Instagram connector not yet implemented")
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    throw new Error("Instagram connector not yet implemented")
  }
}
