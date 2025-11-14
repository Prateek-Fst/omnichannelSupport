import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../common/prisma/prisma.service"

@Injectable()
export class OrganisationsService {
  constructor(private prisma: PrismaService) {}

  async getOrganisation(orgId: string) {
    return this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async updateOrganisation(orgId: string, data: { name?: string }) {
    return this.prisma.organisation.update({
      where: { id: orgId },
      data,
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    })
  }
}
