import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../common/prisma/prisma.service"
import { NotificationType } from "@prisma/client"

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(
    orgId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: any = {}
  ) {
    return this.prisma.notification.create({
      data: {
        orgId,
        type,
        title,
        message,
        data
      }
    })
  }

  async getNotifications(orgId: string, unreadOnly = false) {
    const where: any = { orgId }
    if (unreadOnly) {
      where.isRead = false
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  }

  async markAsRead(orgId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, orgId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  async markAllAsRead(orgId: string) {
    return this.prisma.notification.updateMany({
      where: { orgId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }
}