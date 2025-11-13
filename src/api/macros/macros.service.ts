import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import type { PrismaService } from "../../common/prisma/prisma.service"
import { logger } from "../../common/logger"

@Injectable()
export class MacrosService {
  constructor(private prisma: PrismaService) {}

  async getMacros(orgId: string) {
    return this.prisma.macro.findMany({
      where: { orgId },
      include: { createdByUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    })
  }

  async createMacro(orgId: string, data: any, requesterId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (!user) {
      throw new ForbiddenException("User not found")
    }

    const macro = await this.prisma.macro.create({
      data: {
        orgId,
        name: data.name,
        content: data.content,
        createdBy: requesterId,
      },
      include: { createdByUser: { select: { id: true, name: true } } },
    })

    logger.info(`Macro created: ${macro.id} by ${requesterId}`)

    return macro
  }

  async updateMacro(orgId: string, macroId: string, data: any, requesterId: string) {
    const macro = await this.prisma.macro.findFirst({
      where: { id: macroId, orgId },
    })

    if (!macro) {
      throw new NotFoundException("Macro not found")
    }

    if (macro.createdBy !== requesterId) {
      throw new ForbiddenException("You can only update macros you created")
    }

    const updated = await this.prisma.macro.update({
      where: { id: macroId },
      data: {
        name: data.name,
        content: data.content,
      },
      include: { createdByUser: { select: { id: true, name: true } } },
    })

    logger.info(`Macro updated: ${macroId}`)

    return updated
  }

  async deleteMacro(orgId: string, macroId: string, requesterId: string) {
    const macro = await this.prisma.macro.findFirst({
      where: { id: macroId, orgId },
    })

    if (!macro) {
      throw new NotFoundException("Macro not found")
    }

    // Allow deletion by creator or admin
    const user = await this.prisma.user.findFirst({
      where: { id: requesterId, orgId },
    })

    if (macro.createdBy !== requesterId && user.role !== "ADMIN") {
      throw new ForbiddenException("Only creators or admins can delete macros")
    }

    await this.prisma.macro.delete({
      where: { id: macroId },
    })

    logger.info(`Macro deleted: ${macroId}`)

    return { success: true }
  }
}
