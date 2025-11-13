import { Injectable } from "@nestjs/common"
import type { PrismaService } from "../../common/prisma/prisma.service"

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getTicketAnalytics(orgId: string, filters: any = {}) {
    const fromDate = filters.fromDate ? new Date(filters.fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = filters.toDate ? new Date(filters.toDate) : new Date()

    const stats = await this.prisma.ticketStatistics.findMany({
      where: {
        orgId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { date: "asc" },
    })

    return {
      orgId,
      period: { from: fromDate, to: toDate },
      data: stats,
      summary: {
        totalOpen: stats.reduce((sum, s) => sum + s.openCount, 0),
        totalClosed: stats.reduce((sum, s) => sum + s.closedCount, 0),
        avgResponseTime: Math.floor(stats.reduce((sum, s) => sum + s.avgResponseTime, 0) / (stats.length || 1)),
      },
    }
  }

  async getChannelStats(orgId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { tickets: true, messages: true },
        },
      },
    })

    return channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      tickets: ch._count.tickets,
      messages: ch._count.messages,
    }))
  }

  async getCampaignStats(orgId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { orgId },
      include: {
        recipients: {
          select: { status: true },
        },
      },
    })

    return campaigns.map((campaign) => {
      const stats = campaign.recipients.reduce(
        (acc, r) => {
          acc[r.status.toLowerCase()]++
          return acc
        },
        { pending: 0, sent: 0, failed: 0 },
      )

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        total: campaign.recipients.length,
        ...stats,
      }
    })
  }

  async getAgentPerformance(orgId: string) {
    const agents = await this.prisma.user.findMany({
      where: { orgId, role: "AGENT" },
      include: {
        assignedTickets: {
          select: { status: true, _count: { select: { messages: true } } },
        },
      },
    })

    return agents.map((agent) => {
      const tickets = agent.assignedTickets
      const closed = tickets.filter((t) => t.status === "CLOSED").length
      const open = tickets.filter((t) => t.status === "OPEN").length

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        assignedTickets: tickets.length,
        closedTickets: closed,
        openTickets: open,
        totalMessages: tickets.reduce((sum, t) => sum + (t._count?.messages || 0), 0),
      }
    })
  }
}
