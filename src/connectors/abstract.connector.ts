import type { ChannelConnector, ParsedMessage, OutboundMessage, ProviderSendResult } from "./types"
import { logger } from "../common/logger"

export abstract class AbstractConnector implements ChannelConnector {
  abstract type: "whatsapp" | "instagram" | "facebook" | "twitter" | "linkedin" | "mock"
  protected config: Record<string, any> = {}

  async init(config: Record<string, any>): Promise<void> {
    this.config = config
    logger.info(`${this.type} connector initialized`)
  }

  abstract verifyWebhookSignature(headers: Record<string, string>, body: any): boolean

  abstract parseIncomingWebhook(body: any): Promise<ParsedMessage>

  abstract sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult>

  async refreshToken?(): Promise<void> {
    logger.info(`${this.type} token refresh not implemented`)
  }

  protected parseJson(data: string): Record<string, any> {
    try {
      return JSON.parse(data)
    } catch (e) {
      logger.error(`Failed to parse JSON: ${e}`)
      throw new Error("Invalid JSON payload")
    }
  }
}
