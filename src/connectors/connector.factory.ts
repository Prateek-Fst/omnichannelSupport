import { Injectable } from "@nestjs/common"
import type { ChannelConnector } from "./types"
import { MockConnector } from "./mock.connector"
import { WhatsAppConnector } from "./whatsapp.connector"
import { InstagramConnector } from "./instagram.connector"
import { FacebookConnector } from "./facebook.connector"
import { TwitterConnector } from "./twitter.connector"
import { LinkedInConnector } from "./linkedin.connector"
import { TelegramConnector } from "./telegram.connector"
import { EmailConnector } from "./email.connector"
import { logger } from "../common/logger"

@Injectable()
export class ConnectorFactory {
  private connectors: Map<string, ChannelConnector> = new Map()

  getConnector(type: string): ChannelConnector {
    if (this.connectors.has(type)) {
      return this.connectors.get(type)!
    }

    let connector: ChannelConnector

    switch (type.toLowerCase()) {
      case "mock":
        connector = new MockConnector()
        break
      case "whatsapp":
        connector = new WhatsAppConnector()
        break
      case "instagram":
        connector = new InstagramConnector()
        break
      case "facebook":
        connector = new FacebookConnector()
        break
      case "twitter":
        connector = new TwitterConnector()
        break
      case "linkedin":
        connector = new LinkedInConnector()
        break
      case "telegram":
        connector = new TelegramConnector()
        break
      case "email":
        connector = new EmailConnector()
        break
      default:
        throw new Error(`Unknown connector type: ${type}`)
    }

    this.connectors.set(type, connector)
    logger.info(`Connector ${type} initialized`)

    return connector
  }
}
