import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrismaService } from "../../common/prisma/prisma.service"
import { EmailService } from "../../common/email/email.service"
import { logger } from "../../common/logger"
import { v4 as uuid } from "uuid"

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  async getUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })
  }

  async getUserById(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    return user
  }

  async deactivateUser(orgId: string, userId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can deactivate users")
    }

    if (requesterId === userId) {
      throw new ForbiddenException("Cannot deactivate yourself")
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    })

    logger.info(`User deactivated: ${userId} by ${requesterId}`)

    return user
  }

  async sendInvite(orgId: string, email: string, role: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can invite users")
    }

    const existingInvite = await this.prisma.invite.findFirst({
      where: { orgId, email, accepted: false },
    })

    if (existingInvite && existingInvite.expiresAt > new Date()) {
      throw new ForbiddenException("Invite already sent to this email")
    }

    const token = uuid()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invite = await this.prisma.invite.create({
      data: {
        orgId,
        email,
        role: role as any,
        token,
        expiresAt,
        invitedBy: requesterId,
      },
    })

    // Get organization name for email
    const org = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: { name: true }
    })

    // Send invitation email
    await this.emailService.sendInviteEmail(
      email,
      requester.name,
      org?.name || 'Your Organization',
      role,
      token
    )

    logger.info(`Invite sent to ${email} in org ${orgId}`)

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      inviteLink: `${this.configService.get('FRONTEND_URL')}/accept-invite?token=${invite.token}`,
    }
  }

  async listInvites(orgId: string, requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!requester || requester.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can list invites")
    }

    return this.prisma.invite.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        role: true,
        accepted: true,
        expiresAt: true,
        createdAt: true,
      },
    })
  }
}
