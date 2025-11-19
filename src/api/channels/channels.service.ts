import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrismaService } from "../../common/prisma/prisma.service"
import { ConnectorFactory } from "../../connectors/connector.factory"
import { logger } from "../../common/logger"

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
    private readonly configService: ConfigService,
  ) {}

  async createChannel(orgId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    // if (!requester || requester.role !== "ADMIN") {
    //   throw new ForbiddenException("Only admins can create channels")
    // }

    const existingChannel = await this.prisma.channel.findFirst({
      where: { orgId, type: data.type },
    })

    if (existingChannel) {
      throw new ForbiddenException(`Channel of type ${data.type} already exists`)
    }

    const connector = this.connectorFactory.getConnector(data.type)
    await connector.init(data.config)

    const channel = await this.prisma.channel.create({
      data: {
        orgId,
        type: data.type,
        name: data.name,
        config: data.config,
        isActive: true,
      },
    })



    logger.info(`Channel created: ${channel.id} of type ${channel.type} in org ${orgId}`)

    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://6a9b034f4f25.ngrok-free.app'}/webhook/${channel.id}`
    
    // Test webhook verification endpoint only for Facebook and Instagram
    let webhookTest = null
    if (channel.type === 'FACEBOOK' || channel.type === 'INSTAGRAM') {
      webhookTest = await this.testWebhookVerification(channel.id, data.config.webhookVerifyToken)
    }

    // Auto-setup webhook for Telegram
    let webhookSetup = null
    if (channel.type === ('TELEGRAM' as any)) {
      try {
        webhookSetup = await this.setupWebhookSubscriptionInternal(channel.type, data.config, webhookUrl)
      } catch (error) {
        logger.warn(`Failed to auto-setup Telegram webhook: ${error.message}`)
        webhookSetup = { success: false, error: error.message }
      }
    }

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      isActive: channel.isActive,
      createdAt: channel.createdAt,
      webhookUrl,
      webhookTest,
      webhookSetup,
      instructions: channel.type === ('TELEGRAM' as any)
        ? 'Telegram webhook configured automatically' 
        : `Set this webhook URL in your ${channel.type} app: ${webhookUrl}`
    }
  }

  async getChannels(orgId: string) {
    return this.prisma.channel.findMany({
      where: { orgId },
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    })
  }

  async getChannelById(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId },
    })

    if (!channel) {
      throw new NotFoundException("Channel not found")
    }

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      isActive: channel.isActive,
      createdAt: channel.createdAt,
    }
  }

  async updateChannel(orgId: string, channelId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can update channels")
    }

    const channel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        name: data.name,
        isActive: data.isActive,
      },
    })

    logger.info(`Channel updated: ${channelId}`)

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      isActive: channel.isActive,
    }
  }

  async deleteChannel(orgId: string, channelId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can delete channels")
    }

    await this.prisma.channel.delete({
      where: { id: channelId },
    })

    logger.info(`Channel deleted: ${channelId}`)

    return { success: true }
  }

  async getChannelCustomers(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId }
    })

    if (!channel) {
      throw new NotFoundException("Channel not found")
    }

    return this.prisma.customer.findMany({
      where: {
        orgId,
        platform: channel.type
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    })
  }

  async testInstagramConnection(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'INSTAGRAM' }
    })

    if (!channel) {
      throw new NotFoundException("Instagram channel not found")
    }

    const config = channel.config as any
    const results = {
      channelId,
      config: {
        facebookPageId: config.facebookPageId,
        instagramAccountId: config.instagramAccountId,
        hasPageAccessToken: !!config.pageAccessToken,
        hasAppSecret: !!config.appSecret,
        appId: config.appId,
        webhookVerifyToken: config.webhookVerifyToken
      },
      tests: []
    }

    // Test 1: Check if page access token is valid
    try {
      const pageResponse = await fetch(`https://graph.facebook.com/v18.0/${config.facebookPageId}?access_token=${config.pageAccessToken}`)
      const pageData = await pageResponse.json()
      
      if (pageResponse.ok) {
        results.tests.push({
          test: 'Facebook Page Access',
          status: 'PASS',
          message: `Page found: ${pageData.name}`,
          data: { pageName: pageData.name, pageId: pageData.id }
        })
      } else {
        results.tests.push({
          test: 'Facebook Page Access',
          status: 'FAIL',
          message: pageData.error?.message || 'Failed to access Facebook page',
          data: pageData
        })
      }
    } catch (error) {
      results.tests.push({
        test: 'Facebook Page Access',
        status: 'ERROR',
        message: error.message
      })
    }

    // Test 2: Check Instagram Business Account
    try {
      const igResponse = await fetch(`https://graph.facebook.com/v18.0/${config.instagramAccountId}?access_token=${config.pageAccessToken}`)
      const igData = await igResponse.json()
      
      if (igResponse.ok) {
        results.tests.push({
          test: 'Instagram Account Access',
          status: 'PASS',
          message: `Instagram account found: ${igData.username || igData.name}`,
          data: { username: igData.username, accountId: igData.id }
        })
      } else {
        results.tests.push({
          test: 'Instagram Account Access',
          status: 'FAIL',
          message: igData.error?.message || 'Failed to access Instagram account',
          data: igData
        })
      }
    } catch (error) {
      results.tests.push({
        test: 'Instagram Account Access',
        status: 'ERROR',
        message: error.message
      })
    }

    // Test 3: Check webhook subscription
    try {
      const webhookResponse = await fetch(`https://graph.facebook.com/v18.0/${config.appId}/subscriptions?access_token=${config.pageAccessToken}`)
      const webhookData = await webhookResponse.json()
      
      if (webhookResponse.ok) {
        const instagramSub = webhookData.data?.find(sub => sub.object === 'instagram')
        if (instagramSub) {
          results.tests.push({
            test: 'Webhook Subscription',
            status: 'PASS',
            message: 'Instagram webhook subscription found',
            data: instagramSub
          })
        } else {
          results.tests.push({
            test: 'Webhook Subscription',
            status: 'FAIL',
            message: 'No Instagram webhook subscription found',
            data: webhookData
          })
        }
      } else {
        results.tests.push({
          test: 'Webhook Subscription',
          status: 'FAIL',
          message: webhookData.error?.message || 'Failed to check webhook subscriptions',
          data: webhookData
        })
      }
    } catch (error) {
      results.tests.push({
        test: 'Webhook Subscription',
        status: 'ERROR',
        message: error.message
      })
    }

    logger.info(`Instagram connection test completed for channel: ${channelId} - ${results.tests.length} tests run`)
    return results
  }

  async testFacebookConnection(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'FACEBOOK' }
    })

    if (!channel) {
      throw new NotFoundException("Facebook channel not found")
    }

    const config = channel.config as any
    const results = {
      channelId,
      config: {
        facebookPageId: config.facebookPageId,
        hasPageAccessToken: !!config.pageAccessToken,
        hasAppSecret: !!config.appSecret,
        appId: config.appId,
        webhookVerifyToken: config.webhookVerifyToken
      },
      tests: []
    }

    // Test 1: Check if page access token is valid
    try {
      const pageResponse = await fetch(`https://graph.facebook.com/v18.0/${config.facebookPageId}?access_token=${config.pageAccessToken}`)
      const pageData = await pageResponse.json()
      
      if (pageResponse.ok) {
        results.tests.push({
          test: 'Facebook Page Access',
          status: 'PASS',
          message: `Page found: ${pageData.name}`,
          data: { pageName: pageData.name, pageId: pageData.id }
        })
      } else {
        results.tests.push({
          test: 'Facebook Page Access',
          status: 'FAIL',
          message: pageData.error?.message || 'Failed to access Facebook page',
          data: pageData
        })
      }
    } catch (error) {
      results.tests.push({
        test: 'Facebook Page Access',
        status: 'ERROR',
        message: error.message
      })
    }

    // Test 2: Check webhook subscriptions
    try {
      const webhookResponse = await fetch(`https://graph.facebook.com/v18.0/${config.appId}/subscriptions?access_token=${config.pageAccessToken}`)
      const webhookData = await webhookResponse.json()
      
      if (webhookResponse.ok) {
        const pageSub = webhookData.data?.find(sub => sub.object === 'page')
        if (pageSub) {
          results.tests.push({
            test: 'Facebook Webhook Subscription',
            status: 'PASS',
            message: 'Facebook page webhook subscription found',
            data: pageSub
          })
        } else {
          results.tests.push({
            test: 'Facebook Webhook Subscription',
            status: 'FAIL',
            message: 'No Facebook page webhook subscription found - you need to subscribe!',
            data: webhookData,
            solution: `curl -X POST "https://graph.facebook.com/v18.0/${config.appId}/subscriptions" -d "object=page" -d "callback_url=YOUR_WEBHOOK_URL" -d "verify_token=${config.webhookVerifyToken}" -d "fields=messages,messaging_postbacks,feed" -d "access_token=${config.pageAccessToken}"`
          })
        }
      } else {
        results.tests.push({
          test: 'Facebook Webhook Subscription',
          status: 'FAIL',
          message: webhookData.error?.message || 'Failed to check webhook subscriptions',
          data: webhookData
        })
      }
    } catch (error) {
      results.tests.push({
        test: 'Facebook Webhook Subscription',
        status: 'ERROR',
        message: error.message
      })
    }

    logger.info(`Facebook connection test completed for channel: ${channelId} - ${results.tests.length} tests run`)
    return results
  }

  async testTelegramConnection(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'TELEGRAM' as any }
    })

    if (!channel) {
      throw new NotFoundException("Telegram channel not found")
    }

    const config = channel.config as any
    const results = {
      channelId,
      config: {
        hasBotToken: !!config.botToken,
        hasWebhookSecret: !!config.webhookSecret,
        botUsername: config.botUsername
      },
      tests: []
    }

    const connector = this.connectorFactory.getConnector('TELEGRAM') as any
    await connector.init(config)

    // Test 1: Check if bot token is valid
    try {
      const botData = await connector.getBotInfo()
      
      results.tests.push({
        test: 'Bot Token Validation',
        status: 'PASS',
        message: `Bot found: @${botData.username}`,
        data: { 
          botName: botData.first_name,
          botUsername: botData.username,
          botId: botData.id
        }
      })
    } catch (error) {
      results.tests.push({
        test: 'Bot Token Validation',
        status: 'FAIL',
        message: error.message || 'Invalid bot token'
      })
    }

    // Test 2: Check webhook info
    try {
      const webhookInfo = await connector.getWebhookInfo()
      
      if (webhookInfo.url) {
        results.tests.push({
          test: 'Webhook Configuration',
          status: 'PASS',
          message: `Webhook configured: ${webhookInfo.url}`,
          data: webhookInfo
        })
      } else {
        results.tests.push({
          test: 'Webhook Configuration',
          status: 'FAIL',
          message: 'No webhook configured - you need to set it up!',
          data: webhookInfo,
          solution: `Use the setup webhook endpoint to configure: ${this.configService.get('BACKEND_URL')}/webhook/${channelId}`
        })
      }
    } catch (error) {
      results.tests.push({
        test: 'Webhook Configuration',
        status: 'ERROR',
        message: error.message
      })
    }

    logger.info(`Telegram connection test completed for channel: ${channelId} - ${results.tests.length} tests run`)
    return results
  }

  private async testWebhookVerification(channelId: string, verifyToken: string) {
    try {
      const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://6a9b034f4f25.ngrok-free.app'
      const testUrl = `${baseUrl}/webhook/${channelId}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test_challenge_123`
      
      const response = await fetch(testUrl)
      
      if (response.ok) {
        const challenge = await response.text()
        logger.info(`✅ Webhook verification test passed: ${challenge}`)
        return {
          status: 'PASS',
          message: 'Webhook verification endpoint is working',
          challenge,
          testUrl
        }
      } else {
        logger.warn(`⚠️ Webhook verification test failed: ${response.status}`)
        return {
          status: 'FAIL',
          message: `Webhook verification failed with status: ${response.status}`,
          testUrl
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Webhook verification test error: ${error.message}`)
      return {
        status: 'ERROR',
        message: `Webhook verification error: ${error.message}`,
        testUrl: `${process.env.WEBHOOK_BASE_URL || 'https://6a9b034f4f25.ngrok-free.app'}/webhook/${channelId}`
      }
    }
  }

  async setupWebhookSubscription(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId }
    })

    if (!channel) {
      throw new NotFoundException("Channel not found")
    }

    const config = channel.config as any
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://6a9b034f4f25.ngrok-free.app'}/webhook/${channelId}`

    return this.setupWebhookSubscriptionInternal(channel.type, config, webhookUrl)
  }

  private async setupWebhookSubscriptionInternal(channelType: string, config: any, webhookUrl: string) {
    try {
      if (!webhookUrl) {
        throw new Error(`No webhook URL provided for ${channelType} channel`)
      }

      // For Facebook channels
      if (channelType === 'FACEBOOK') {
        // Step 1: Create webhook subscription
        const webhookResponse = await fetch(`https://graph.facebook.com/v18.0/${config.appId}/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            object: 'page',
            callback_url: webhookUrl,
            verify_token: config.webhookVerifyToken,
            fields: 'messages,messaging_postbacks,feed',
            access_token: `${config.appId}|${config.appSecret}`
          })
        })

        const webhookResult = await webhookResponse.json()
        
        if (webhookResponse.ok && webhookResult.success) {
          logger.info(`✅ Facebook webhook subscription created successfully`)
        } else {
          logger.error(`❌ Failed to create Facebook webhook subscription: ${JSON.stringify(webhookResult)}`)
          throw new Error(`Facebook webhook setup failed: ${webhookResult.error?.message || 'Unknown error'}`)
        }

        // Step 2: Subscribe page to app
        const pageResponse = await fetch(`https://graph.facebook.com/v18.0/${config.facebookPageId}/subscribed_apps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries',
            access_token: config.pageAccessToken
          })
        })

        const pageResult = await pageResponse.json()
        
        if (pageResponse.ok && pageResult.success) {
          logger.info(`✅ Facebook page subscribed to app successfully`)
        } else {
          logger.error(`❌ Failed to subscribe Facebook page to app: ${JSON.stringify(pageResult)}`)
          throw new Error(`Facebook page subscription failed: ${pageResult.error?.message || 'Unknown error'}`)
        }

        return { success: true, message: 'Facebook webhook subscription and page subscription completed successfully' }
      }

      // For Instagram channels
      if (channelType === 'INSTAGRAM') {
        const response = await fetch(`https://graph.facebook.com/v18.0/${config.appId}/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            object: 'instagram',
            callback_url: webhookUrl,
            verify_token: config.webhookVerifyToken,
            fields: 'messages,messaging_postbacks,messaging_optins',
            access_token: `${config.appId}|${config.appSecret}`
          })
        })

        const result = await response.json()
        
        if (response.ok && result.success) {
          logger.info(`✅ Instagram webhook subscription created successfully`)
        } else {
          logger.error(`❌ Failed to create Instagram webhook subscription: ${JSON.stringify(result)}`)
          throw new Error(`Instagram webhook setup failed: ${result.error?.message || 'Unknown error'}`)
        }

        return { success: true, message: 'Instagram webhook subscription created successfully' }
      }

      // For Telegram channels
      if (channelType === 'TELEGRAM') {
        const connector = this.connectorFactory.getConnector('TELEGRAM') as any
        await connector.init(config)
        
        const result = await connector.setupWebhook(webhookUrl)
        
        if (result.ok) {
          logger.info(`✅ Telegram webhook set successfully`)
          return { success: true, message: 'Telegram webhook configured successfully' }
        } else {
          logger.error(`❌ Failed to set Telegram webhook: ${JSON.stringify(result)}`)
          throw new Error(`Telegram webhook setup failed: ${result.description || 'Unknown error'}`)
        }
      }

    } catch (error) {
      logger.error(`Webhook setup failed for ${channelType}: ${error.message}`)
      throw new Error(`Failed to setup ${channelType} webhooks: ${error.message}`)
    }
  }
}
