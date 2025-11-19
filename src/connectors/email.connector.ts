import { Injectable } from '@nestjs/common'
import { AbstractConnector } from './abstract.connector'
import { ParsedMessage, OutboundMessage, ProviderSendResult } from './types'
import { logger } from '../common/logger'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailConnector extends AbstractConnector {
  type: "email" = "email"
  private transporter: nodemailer.Transporter
  private imapConfig: any

  async init(config: any): Promise<void> {
    super.init(config)
    
    if (!config.smtpHost || !config.smtpPort || !config.email || !config.password) {
      throw new Error('Email configuration incomplete: smtpHost, smtpPort, email, and password are required')
    }

    // Setup SMTP transporter for sending emails
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.email,
        pass: config.password
      }
    })

    // Store IMAP config for reading emails
    this.imapConfig = {
      host: config.imapHost || config.smtpHost,
      port: config.imapPort || 993,
      secure: true,
      auth: {
        user: config.email,
        pass: config.password
      }
    }

    logger.info('Email connector initialized')
  }

  async parseIncomingWebhook(body: any): Promise<ParsedMessage> {
    // For email, this would typically be called by an email webhook service
    // or IMAP polling service that converts emails to this format
    logger.info(`Parsing email webhook: ${JSON.stringify(body, null, 2)}`)

    if (!body.from || !body.subject || !body.text) {
      throw new Error('Invalid email format: from, subject, and text are required')
    }

    return {
      externalMessageId: body.messageId || `email-${Date.now()}`,
      externalThreadId: body.threadId || body.subject,
      senderPhone: body.from,
      senderName: body.fromName || body.from,
      content: body.text,
      messageType: 'message',
      timestamp: new Date(body.date || Date.now()),
      metadata: {
        subject: body.subject,
        html: body.html,
        attachments: body.attachments || [],
        originalEmail: body
      }
    }
  }

  async sendMessage(message: OutboundMessage): Promise<ProviderSendResult> {
    if (!this.transporter) {
      throw new Error('Email connector not initialized')
    }

    try {
      const mailOptions = {
        from: `"Support Team" <${this.config.email}>`,
        to: message.externalThreadId,
        subject: message.metadata?.subject || 'Re: Support Ticket',
        text: message.content,
        html: message.content.replace(/\n/g, '<br>'),
        inReplyTo: message.metadata?.inReplyTo,
        references: message.metadata?.references
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      logger.info(`📤 Email sent successfully: ${result.messageId}`)
      return {
        success: true,
        externalMessageId: result.messageId
      }
    } catch (error) {
      logger.error(`❌ Failed to send email: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  verifyWebhookSignature(headers: Record<string, string>, body: any): boolean {
    // Email webhooks typically don't require signature verification
    // This would depend on the email service provider (SendGrid, Mailgun, etc.)
    return true
  }

  // Helper method to test email configuration
  async testConnection(): Promise<any> {
    try {
      await this.transporter.verify()
      return { success: true, message: 'Email configuration is valid' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Helper method to get email configuration info
  getConfigInfo(): any {
    return {
      email: this.config.email,
      smtpHost: this.config.smtpHost,
      smtpPort: this.config.smtpPort,
      imapHost: this.imapConfig.host,
      imapPort: this.imapConfig.port
    }
  }
}