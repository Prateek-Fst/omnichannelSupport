import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common"
import * as bcrypt from "bcryptjs"
import type { JwtService } from "@nestjs/jwt"
import type { PrismaService } from "../../common/prisma/prisma.service"
import type { RedisService } from "../../common/redis/redis.service"
import type { SignupDto } from "./dto/signup.dto"
import type { LoginDto } from "./dto/login.dto"
import type { RefreshTokenDto } from "./dto/refresh-token.dto"
import type { AcceptInviteDto } from "./dto/accept-invite.dto"
import { logger } from "../../common/logger"

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existingUser) {
      throw new BadRequestException("Email already in use")
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const org = await this.prisma.organisation.create({
      data: { name: dto.orgName },
    })

    const user = await this.prisma.user.create({
      data: {
        orgId: org.id,
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: "ADMIN",
      },
    })

    logger.info(`New organisation created: ${org.id} with admin: ${user.id}`)

    const tokens = await this.generateTokens(user.id, user.orgId, user.role)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
      ...tokens,
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials")
    }

    if (!user.isActive) {
      throw new UnauthorizedException("User account is inactive")
    }

    logger.info(`User logged in: ${user.id}`)

    const tokens = await this.generateTokens(user.id, user.orgId, user.role)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
      ...tokens,
    }
  }

  async refreshAccessToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive")
      }

      const accessToken = this.jwtService.sign(
        {
          email: user.email,
          role: user.role,
          orgId: user.orgId,
        },
        {
          subject: user.id,
          expiresIn: process.env.JWT_EXPIRATION || "15m",
          secret: process.env.JWT_SECRET,
        },
      )

      return { accessToken }
    } catch (err) {
      throw new UnauthorizedException("Invalid refresh token")
    }
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.prisma.invite.findUnique({
      where: { token: dto.token },
    })

    if (!invite) {
      throw new BadRequestException("Invalid invite token")
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException("Invite has expired")
    }

    if (invite.accepted) {
      throw new BadRequestException("Invite has already been accepted")
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: invite.email,
        orgId: invite.orgId,
      },
    })

    if (existingUser) {
      throw new BadRequestException("User already exists in organisation")
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        orgId: invite.orgId,
        name: dto.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
      },
    })

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { accepted: true },
    })

    logger.info(`User accepted invite: ${user.id} in org: ${invite.orgId}`)

    const tokens = await this.generateTokens(user.id, user.orgId, user.role)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
      ...tokens,
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
        isActive: true,
      },
    })

    if (!user) {
      throw new UnauthorizedException("User not found")
    }

    return user
  }

  private async generateTokens(userId: string, orgId: string, role: string) {
    const accessToken = this.jwtService.sign(
      {
        email: userId,
        role,
        orgId,
      },
      {
        subject: userId,
        expiresIn: process.env.JWT_EXPIRATION || "15m"
      },
    )

    const refreshToken = this.jwtService.sign(
      {
        email: userId,
        orgId,
      },
      {
        subject: userId,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || "30d"
      },
    )

    return { accessToken, refreshToken }
  }
}
