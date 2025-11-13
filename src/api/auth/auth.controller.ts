import { Controller, Post, Get, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import type { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import type { SignupDto } from "./dto/signup.dto"
import type { LoginDto } from "./dto/login.dto"
import type { RefreshTokenDto } from "./dto/refresh-token.dto"
import type { AcceptInviteDto } from "./dto/accept-invite.dto"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("signup")
  async signup(dto: SignupDto) {
    return this.authService.signup(dto)
  }

  @Post("login")
  async login(dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post("refresh")
  async refresh(dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto)
  }

  @Post("accept-invite")
  async acceptInvite(dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto)
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMe(req) {
    return this.authService.getMe(req.user.id)
  }
}
