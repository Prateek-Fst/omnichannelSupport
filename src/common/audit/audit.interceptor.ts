import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"
import type { PrismaService } from "../prisma/prisma.service"
import { logger } from "../logger"

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, path, user, body } = request

    return next.handle().pipe(
      tap(async (result) => {
        try {
          if (user && user.orgId && this.shouldAudit(method, path)) {
            const action = this.mapMethodToAction(method)
            const { entity, entityId } = this.extractEntityInfo(path)

            await this.prisma.auditLog.create({
              data: {
                orgId: user.orgId,
                userId: user.id,
                action,
                entity,
                entityId: entityId || "unknown",
                metadata: {
                  path,
                  method,
                  ip: request.ip,
                  userAgent: request.headers["user-agent"],
                },
              },
            })
          }
        } catch (err) {
          logger.error(`Audit log creation failed: ${err.message}`)
        }
      }),
    )
  }

  private shouldAudit(method: string, path: string): boolean {
    // Only audit state-changing operations
    return ["POST", "PUT", "DELETE", "PATCH"].includes(method)
  }

  private mapMethodToAction(method: string): string {
    const actionMap = {
      POST: "CREATE",
      PUT: "UPDATE",
      PATCH: "UPDATE",
      DELETE: "DELETE",
    }
    return actionMap[method] || "UNKNOWN"
  }

  private extractEntityInfo(path: string): { entity: string; entityId?: string } {
    const pathParts = path.split("/").filter(Boolean)

    if (pathParts.includes("tickets")) {
      const ticketIdx = pathParts.indexOf("tickets")
      return {
        entity: "TICKET",
        entityId: pathParts[ticketIdx + 1],
      }
    }

    if (pathParts.includes("channels")) {
      const channelIdx = pathParts.indexOf("channels")
      return {
        entity: "CHANNEL",
        entityId: pathParts[channelIdx + 1],
      }
    }

    if (pathParts.includes("campaigns")) {
      const campaignIdx = pathParts.indexOf("campaigns")
      return {
        entity: "CAMPAIGN",
        entityId: pathParts[campaignIdx + 1],
      }
    }

    if (pathParts.includes("users")) {
      const userIdx = pathParts.indexOf("users")
      return {
        entity: "USER",
        entityId: pathParts[userIdx + 1],
      }
    }

    return { entity: "UNKNOWN" }
  }
}
