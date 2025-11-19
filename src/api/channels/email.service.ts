import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { ConnectorFactory } from '../../connectors/connector.factory'
import { logger } from '../../common/logger'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

@Injectable()
export class EmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  async fetchEmails(orgId: string, channelId: string, page: number = 1, limit: number = 10) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'EMAIL' as any }
    })

    if (!channel) {
      throw new Error('Email channel not found')
    }

    const config = channel.config as any
    const client = new ImapFlow({
      host: config.imapHost || config.smtpHost,
      port: config.imapPort || 993,
      secure: true,
      auth: {
        user: config.email,
        pass: config.password
      },
      socketTimeout: 60000,
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      logger: false
    })

    client.on('error', (err) => {
      logger.error(`IMAP client error: ${err.message}`)
    })

    try {
      await client.connect()
      logger.info(`📧 Connected to IMAP for channel: ${channelId}`)

      const lock = await client.getMailboxLock('INBOX')
      let emails = []

      try {
        const mailboxStatus = await client.status('INBOX', { messages: true })
        const totalMessages = mailboxStatus.messages

        const start = Math.max(1, totalMessages - (page * limit) + 1)
        const end = Math.min(totalMessages, totalMessages - ((page - 1) * limit))

        if (start <= end) {
          const messages = client.fetch(`${start}:${end}`, {
            envelope: true,
            source: true, // Get full email source
            uid: true,
            flags: true
          })

          for await (let message of messages) {
            try {
              // Use mailparser to properly parse the email
              const parsed = await simpleParser(message.source)
              
              const from = message.envelope.from?.[0]
              const subject = message.envelope.subject || 'No Subject'
              
              // Extract text content (prefer plain text, fallback to HTML)
              let body = ''
              if (parsed.text) {
                body = parsed.text.trim()
              } else if (parsed.html) {
                // Strip HTML tags for preview
                body = parsed.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
              } else if (parsed.textAsHtml) {
                body = parsed.textAsHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
              }

              // Fallback if still no content
              if (!body || body.length === 0) {
                body = `[No readable content available]`
              } else {
                // Limit preview length
                body = body.substring(0, 1000)
              }

              const isRead = message.flags?.has('\\Seen') || false

              emails.push({
                uid: message.uid,
                messageId: parsed.messageId || `email-${message.uid}`,
                from: from?.address || 'Unknown',
                fromName: from?.name || from?.address || 'Unknown',
                subject: subject,
                content: body,
                date: message.envelope.date?.toISOString() || new Date().toISOString(),
                isRead: isRead,
                threadId: subject
              })
            } catch (parseError) {
              logger.error(`Failed to parse email ${message.uid}: ${parseError.message}`)
              // Add email with minimal info
              const from = message.envelope.from?.[0]
              emails.push({
                uid: message.uid,
                messageId: `email-${message.uid}`,
                from: from?.address || 'Unknown',
                fromName: from?.name || 'Unknown',
                subject: message.envelope.subject || 'No Subject',
                content: '[Failed to parse email content]',
                date: message.envelope.date?.toISOString() || new Date().toISOString(),
                isRead: message.flags?.has('\\Seen') || false,
                threadId: message.envelope.subject || 'No Subject'
              })
            }
          }
        }

        // Sort by date descending (newest first)
        emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return {
          emails,
          pagination: {
            page,
            limit,
            total: totalMessages,
            totalPages: Math.ceil(totalMessages / limit),
            hasNext: page < Math.ceil(totalMessages / limit),
            hasPrev: page > 1
          }
        }
      } finally {
        lock.release()
      }
    } catch (error) {
      logger.error(`❌ Failed to fetch emails for channel ${channelId}: ${error.message}`)
      logger.error(`Full error: ${JSON.stringify(error)}`)
      throw new Error(`Failed to fetch emails: ${error.message}`)
    } finally {
      try {
        await client.logout()
      } catch (logoutError) {
        logger.warn(`Warning: Failed to logout IMAP client: ${logoutError.message}`)
      }
    }
  }

  async replyToEmail(orgId: string, channelId: string, emailUid: string, replyContent: string, subject: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'EMAIL' as any }
    })

    if (!channel) {
      throw new Error('Email channel not found')
    }

    const emailDetails = await this.getEmailDetails(channelId, emailUid)

    const connector = this.connectorFactory.getConnector('EMAIL') as any
    await connector.init(channel.config)

    const result = await connector.sendMessage({
      ticketId: `email-${emailUid}`,
      externalThreadId: emailDetails.from,
      content: replyContent,
      senderName: 'Support Team',
      metadata: {
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        inReplyTo: emailDetails.messageId,
        references: emailDetails.messageId
      }
    })

    logger.info(`📤 Email reply sent to ${emailDetails.from}`)
    return result
  }

  private async getEmailDetails(channelId: string, emailUid: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId }
    })

    const config = channel.config as any
    const client = new ImapFlow({
      host: config.imapHost || config.smtpHost,
      port: config.imapPort || 993,
      secure: true,
      auth: {
        user: config.email,
        pass: config.password
      },
      socketTimeout: 60000,
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      logger: false
    })

    client.on('error', (err) => {
      logger.error(`IMAP client error: ${err.message}`)
    })

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')

      try {
        const messages = client.fetch({ uid: emailUid }, {
          envelope: true,
          source: true
        })

        for await (let message of messages) {
          const parsed = await simpleParser(message.source)
          const from = message.envelope.from?.[0]

          let content = ''
          if (parsed.text) {
            content = parsed.text.trim()
          } else if (parsed.html) {
            content = parsed.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          } else {
            content = 'No content available'
          }

          return {
            messageId: parsed.messageId || `email-${message.uid}`,
            from: from?.address || 'Unknown',
            subject: message.envelope.subject || 'No Subject',
            content: content
          }
        }
      } finally {
        lock.release()
      }
    } catch (error) {
      logger.error(`❌ Failed to get email details: ${error.message}`)
      throw error
    } finally {
      try {
        await client.logout()
      } catch (logoutError) {
        logger.warn(`Warning: Failed to logout IMAP client: ${logoutError.message}`)
      }
    }
  }

  async markEmailAsRead(channelId: string, emailUid: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId }
    })

    const config = channel.config as any
    const client = new ImapFlow({
      host: config.imapHost || config.smtpHost,
      port: config.imapPort || 993,
      secure: true,
      auth: {
        user: config.email,
        pass: config.password
      },
      socketTimeout: 60000,
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      logger: false
    })

    client.on('error', (err) => {
      logger.error(`IMAP client error: ${err.message}`)
    })

    try {
      await client.connect()
      await client.messageFlagsAdd({ uid: emailUid }, ['\\Seen'])
      logger.info(`✅ Email ${emailUid} marked as read`)
    } catch (error) {
      logger.error(`❌ Failed to mark email as read: ${error.message}`)
    } finally {
      try {
        await client.logout()
      } catch (logoutError) {
        logger.warn(`Warning: Failed to logout IMAP client: ${logoutError.message}`)
      }
    }
  }
}