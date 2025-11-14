import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../common/prisma/prisma.service"
import { ChannelType } from "@prisma/client"

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(orgId: string, filters: { platform?: string; search?: string }) {
    const where: any = { orgId }
    
    if (filters.platform) {
      where.platform = filters.platform.toUpperCase() as ChannelType
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { externalId: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    return this.prisma.customer.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    })
  }

  async getCustomersByPlatform(orgId: string) {
    const customers = await this.prisma.customer.groupBy({
      by: ['platform'],
      where: { orgId },
      _count: {
        id: true
      },
      orderBy: {
        platform: 'asc'
      }
    })

    return customers.map(group => ({
      platform: group.platform,
      count: group._count.id
    }))
  }

  async getCustomersWithPlatformStats(orgId: string) {
    const [customers, platformStats] = await Promise.all([
      this.getCustomers(orgId, {}),
      this.getCustomersByPlatform(orgId)
    ])

    return {
      customers,
      platformStats,
      totalCustomers: customers.length
    }
  }

  async getCustomer(orgId: string, customerId: string) {
    return this.prisma.customer.findFirst({
      where: { id: customerId, orgId },
      include: {
        tickets: {
          orderBy: { updatedAt: 'desc' },
          take: 5
        }
      }
    })
  }

  async getCustomerTickets(orgId: string, customerId: string) {
    return this.prisma.ticket.findMany({
      where: { customerId, orgId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
  }

  async findOrCreateCustomer(orgId: string, platform: ChannelType, externalId: string, name: string) {
    let customer = await this.prisma.customer.findFirst({
      where: { orgId, platform, externalId }
    })

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          orgId,
          platform,
          externalId,
          name,
          lastMessageAt: new Date()
        }
      })
    }

    return customer
  }

  async updateCustomerLastMessage(customerId: string, message: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        lastMessage: message,
        lastMessageAt: new Date()
      }
    })
  }
}