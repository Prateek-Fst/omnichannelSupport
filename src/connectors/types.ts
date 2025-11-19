export interface ParsedMessage {
  externalMessageId: string
  externalThreadId: string
  senderName: string
  senderPhone?: string
  content: string
  timestamp: Date
  messageType?: 'message' | 'comment' | 'mention' | 'story_reply'
  postId?: string // For comments/mentions
  mediaUrls?: string[] // For media messages
  metadata?: Record<string, any>
}

export interface OutboundMessage {
  ticketId: string
  externalThreadId: string
  content: string
  senderName: string
  metadata?: Record<string, any>
}

export interface ProviderSendResult {
  success: boolean
  externalMessageId?: string
  error?: string
}

export interface ChannelConnector {
  type: "whatsapp" | "instagram" | "facebook" | "twitter" | "linkedin" | "telegram" | "mock"
  init(config: Record<string, any>): Promise<void>
  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean
  parseIncomingWebhook(body: any): Promise<ParsedMessage>
  sendMessage(outbound: OutboundMessage): Promise<ProviderSendResult>
  refreshToken?(): Promise<void>
}
