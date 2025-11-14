import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { NotificationsService } from "./notifications.service"

@Controller("orgs/:orgId/notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Param("orgId") orgId: string,
    @Query("unreadOnly") unreadOnly?: string
  ) {
    return this.notificationsService.getNotifications(orgId, unreadOnly === 'true')
  }

  @Patch("/:notificationId/read")
  async markAsRead(
    @Param("orgId") orgId: string,
    @Param("notificationId") notificationId: string
  ) {
    return this.notificationsService.markAsRead(orgId, notificationId)
  }

  @Patch("/mark-all-read")
  async markAllAsRead(@Param("orgId") orgId: string) {
    return this.notificationsService.markAllAsRead(orgId)
  }
}