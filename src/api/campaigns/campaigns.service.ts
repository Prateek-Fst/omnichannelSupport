import { Injectable } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bull"
import { Queue } from "bull"
import { PrismaService } from "../../common/prisma/prisma.service"
import { logger } from "../../common/logger"

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("campaigns") private campaignQueue: Queue,
  ) {}

  async getCampaigns(orgId: string) {
    return this.prisma.campaign.findMany({
      where: { orgId },
      include: {
        channel: true,
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  async getCampaignById(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
      include: {
        channel: true,
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        recipients: true,
      },
    })

    if (!campaign) {
      throw new Error("Campaign not found")
    }

    return campaign
  }

  async createCampaign(orgId: string, data: any, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: {
        id: requesterId,
        orgId,
      },
    })

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: data.channelId,
        orgId,
      },
    })

    const campaign = await this.prisma.campaign.create({
      data: {
        orgId,
        channelId: data.channelId,
        name: data.name,
        messageTemplate: data.messageTemplate,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: requesterId,
      },
      include: {
        channel: true,
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    logger.info(`Campaign created: ${campaign.id} by user: ${requesterId}`)
    return campaign
  }

  async addRecipients(orgId: string, campaignId: string, recipients: string[]) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
    })

    if (!campaign) {
      throw new Error("Campaign not found")
    }

    const recipientData = recipients.map((contact) => ({
      campaignId,
      recipientContact: contact,
    }))

    await Promise.all(
      recipientData.map((data) =>
        this.prisma.campaignRecipient.create({
          data,
        }),
      ),
    )

    logger.info(`Added ${recipients.length} recipients to campaign: ${campaignId}`)
    return { success: true, count: recipients.length }
  }

  async startCampaign(orgId: string, campaignId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: {
        id: requesterId,
        orgId,
      },
    })

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
    })

    if (!campaign) {
      throw new Error("Campaign not found")
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    })

    await this.campaignQueue.add("start-campaign", { campaignId })

    logger.info(`Campaign started: ${campaignId} by user: ${requesterId}`)
    return updated
  }

  async getRecipients(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
    })

    return this.prisma.campaignRecipient.findMany({
      where: { campaignId },
    })
  }

  async getCampaignStats(orgId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        orgId,
      },
    })

    const stats = await this.prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { status: true },
    })

    return stats
  }
}