import { AbstractConnector } from "./abstract.connector"
import type { ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"

export class TwitterConnector extends AbstractConnector {
  type = "twitter" as const

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    logger.warn("Twitter webhook signature verification not implemented")
    return true
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    throw new Error("Twitter connector not yet implemented")
  }

  async sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult> {
    throw new Error("Twitter connector not yet implemented")
  }
}
