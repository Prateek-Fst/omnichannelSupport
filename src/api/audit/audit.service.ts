import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../common/prisma/prisma.service"

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async getAuditLogs(orgId: string, filters: any = {}) {
    const where: any = { orgId }

    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.entity) where.entity = filters.entity
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate)
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate)
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Number.parseInt(filters.limit) || 100,
      skip: Number.parseInt(filters.offset) || 0,
    })
  }

  async getActionSummary(orgId: string) {
    const logs = await this.prisma.auditLog.groupBy({
      by: ["action"],
      where: { orgId },
      _count: { id: true },
    })

    return logs.map((log) => ({
      action: log.action,
      count: log._count.id,
    }))
  }

  async getUserActivity(orgId: string, userId: string) {
    return this.prisma.auditLog.findMany({
      where: { orgId, userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  }
}
