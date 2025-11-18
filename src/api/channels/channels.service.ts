import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import { PrismaService } from "../../common/prisma/prisma.service"
import { ConnectorFactory } from "../../connectors/connector.factory"
import { logger } from "../../common/logger"

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  async createChannel(orgId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can create channels")
    }

    const existingChannel = await this.prisma.channel.findFirst({
      where: { orgId, type: data.type },
    })

    if (existingChannel) {
      throw new ForbiddenException(`Channel of type ${data.type} already exists`)
    }

    const connector = this.connectorFactory.getConnector(data.type)
    await connector.init(data.config)

    // Auto-setup webhooks for Facebook/Instagram channels
    if (data.type === 'FACEBOOK' || data.type === 'INSTAGRAM') {
      await this.setupWebhookSubscription(data.type, data.config)
    }

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

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      isActive: channel.isActive,
      createdAt: channel.createdAt,
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

  private async setupWebhookSubscription(channelType: string, config: any) {
    try {
      const webhookUrl = config.webhookUrl || process.env.WEBHOOK_BASE_URL
      if (!webhookUrl) {
        logger.warn(`No webhook URL provided for ${channelType} channel - skipping webhook setup`)
        return
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
      }

    } catch (error) {
      logger.error(`Webhook setup failed for ${channelType}: ${error.message}`)
      throw new Error(`Failed to setup ${channelType} webhooks: ${error.message}`)
    }
  }
}
