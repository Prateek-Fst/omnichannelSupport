import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ChannelsService } from "./channels.service"
import { EmailService } from "./email.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RbacGuard } from "../auth/guards/rbac.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { CreateInstagramChannelDto } from "./dto/create-instagram-channel.dto"
import { CreateFacebookChannelDto } from "./dto/create-facebook-channel.dto"

@ApiTags("channels")
@Controller("orgs/:orgId/channels")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChannelsController {
  constructor(
    private channelsService: ChannelsService,
    private emailService: EmailService
  ) {}

  @Post()
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async createChannel(@Param('orgId') orgId: string, @Body() body: CreateInstagramChannelDto | CreateFacebookChannelDto | any, @Request() req) {
    return this.channelsService.createChannel(orgId, body, req.user.id)
  }

  @Get()
  async getChannels(@Param('orgId') orgId: string) {
    return this.channelsService.getChannels(orgId);
  }

  @Get(":channelId")
  async getChannelById(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    return this.channelsService.getChannelById(orgId, channelId)
  }

  @Put(":channelId")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async updateChannel(
    @Param('orgId') orgId: string,
    @Param('channelId') channelId: string,
    @Body() body: any,
    @Request() req,
  ) {
    return this.channelsService.updateChannel(orgId, channelId, body, req.user.id)
  }

  @Delete(":channelId")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async deleteChannel(@Param('orgId') orgId: string, @Param('channelId') channelId: string, @Request() req) {
    return this.channelsService.deleteChannel(orgId, channelId, req.user.id)
  }

  @Get(":channelId/customers")
  async getChannelCustomers(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    return this.channelsService.getChannelCustomers(orgId, channelId)
  }

  @Post(":channelId/test-connection")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async testConnection(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    // Get channel type first
    const channel = await this.channelsService.getChannelById(orgId, channelId)
    const channelType = channel.type as string
    
    if (channelType === 'INSTAGRAM') {
      return this.channelsService.testInstagramConnection(orgId, channelId)
    } else if (channelType === 'FACEBOOK') {
      return this.channelsService.testFacebookConnection(orgId, channelId)
    } else if (channelType === 'TELEGRAM') {
      return this.channelsService.testTelegramConnection(orgId, channelId)
    } else if (channelType === 'EMAIL') {
      return this.channelsService.testEmailConnection(orgId, channelId)
    } else {
      throw new Error(`Test connection not implemented for ${channelType}`)
    }
  }

  @Post(":channelId/setup-webhook")
  @UseGuards(RbacGuard)
  @Roles("ADMIN")
  async setupWebhook(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    return this.channelsService.setupWebhookSubscription(orgId, channelId)
  }

  @Get(":channelId/emails")
  async getEmails(
    @Param('orgId') orgId: string, 
    @Param('channelId') channelId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.emailService.fetchEmails(orgId, channelId, parseInt(page), parseInt(limit))
  }

  @Post(":channelId/emails/:emailUid/reply")
  async replyToEmail(
    @Param('orgId') orgId: string,
    @Param('channelId') channelId: string,
    @Param('emailUid') emailUid: string,
    @Body() body: { content: string; subject: string }
  ) {
    return this.emailService.replyToEmail(orgId, channelId, emailUid, body.content, body.subject)
  }

  @Post(":channelId/emails/:emailUid/mark-read")
  async markEmailAsRead(
    @Param('orgId') orgId: string,
    @Param('channelId') channelId: string,
    @Param('emailUid') emailUid: string
  ) {
    return this.emailService.markEmailAsRead(channelId, emailUid)
  }
}