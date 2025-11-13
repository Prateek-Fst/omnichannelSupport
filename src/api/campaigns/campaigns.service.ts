import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import type { PrismaService } from "../../common/prisma/prisma.service"
import type { Queue } from "bull"
import { InjectQueue } from "@nestjs/bull"
import { logger } from "../../common/logger"

@Injectable()
export class CampaignsService {
  private campaignQueue: Queue

  constructor(private prisma: PrismaService) {
    this.campaignQueue = InjectQueue("campaigns")
  }

  async getCampaigns(orgId: string) {
    return this.prisma.campaign.findMany({
      where: { orgId },
      include: {
        channel: { select: { id: true, name: true, type: true } },
        createdByUser: { select: { id: true, name: true } },
        recipients: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async getCampaignById(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, orgId },
      include: {
        channel: { select: { id: true, name: true, type: true } },
        createdByUser: { select: { id: true, name: true } },
        recipients: {
          include: { campaign: false },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!campaign) {
      throw new NotFoundException("Campaign not found")
    }

    return campaign
  }

  async createCampaign(orgId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can create campaigns")
    }

    const channel = await this.prisma.channel.findFirst({
      where: { id: data.channelId, orgId },
    })

    if (!channel) {
      throw new NotFoundException("Channel not found")
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        orgId,
        channelId: data.channelId,
        name: data.name,
        messageTemplate: data.messageTemplate,
        status: "DRAFT",
        scheduledAt: data.scheduledAt,
        createdBy: requesterId,
      },
      include: {
        channel: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
      },
    })

    logger.info(`Campaign created: ${campaign.id} by ${requesterId}`)

    return campaign
  }

  async addRecipients(orgId: string, campaignId: string, recipients: string[]) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, orgId },
    })

    if (!campaign) {
      throw new NotFoundException("Campaign not found")
    }

    if (campaign.status !== "DRAFT") {
      throw new ForbiddenException("Can only add recipients to draft campaigns")
    }

    const createdRecipients = await Promise.all(
      recipients.map((contact) =>
        this.prisma.campaignRecipient.create({
          data: {
            campaignId,
            recipientContact: contact,
            status: "PENDING",
          },
        }),
      ),
    )

    logger.info(`Added ${createdRecipients.length} recipients to campaign ${campaignId}`)

    return createdRecipients
  }

  async startCampaign(orgId: string, campaignId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can start campaigns")
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, orgId },
    })

    if (!campaign) {
      throw new NotFoundException("Campaign not found")
    }

    if (campaign.status !== "DRAFT") {
      throw new ForbiddenException("Can only start draft campaigns")
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    })

    // Queue campaign for processing
    await this.campaignQueue.add("send-campaign", { campaignId, orgId }, { priority: 1, removeOnComplete: false })

    logger.info(`Campaign started: ${campaignId}`)

    return updated
  }

  async getRecipients(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, orgId },
    })

    if (!campaign) {
      throw new NotFoundException("Campaign not found")
    }

    return this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    })
  }

  async getCampaignStats(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, orgId },
    })

    if (!campaign) {
      throw new NotFoundException("Campaign not found")
    }

    const stats = await this.prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { id: true },
    })

    return {
      campaignId,
      total: stats.reduce((sum, s) => sum + s._count.id, 0),
      pending: stats.find((s) => s.status === "PENDING")?._count.id || 0,
      sent: stats.find((s) => s.status === "SENT")?._count.id || 0,
      failed: stats.find((s) => s.status === "FAILED")?._count.id || 0,
    }
  }
}
