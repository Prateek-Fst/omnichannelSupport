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
}
