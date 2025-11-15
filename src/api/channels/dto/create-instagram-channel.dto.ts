import { IsString, IsNotEmpty, ValidateNested, IsOptional } from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"

class InstagramChannelConfig {
  @ApiProperty({ description: "Facebook Page ID connected to Instagram Business Account" })
  @IsString()
  @IsNotEmpty()
  facebookPageId: string

  @ApiProperty({ description: "Instagram Business Account ID" })
  @IsString()
  @IsNotEmpty()
  instagramAccountId: string

  @ApiProperty({ description: "Facebook Page Access Token (long-lived)" })
  @IsString()
  @IsNotEmpty()
  pageAccessToken: string

  @ApiProperty({ description: "Facebook App Secret for webhook verification" })
  @IsString()
  @IsNotEmpty()
  appSecret: string

  @ApiProperty({ description: "Facebook App ID" })
  @IsString()
  @IsNotEmpty()
  appId: string

  @ApiProperty({ description: "Custom webhook verification token" })
  @IsString()
  @IsNotEmpty()
  webhookVerifyToken: string

  @ApiProperty({ description: "Webhook URL for receiving Instagram messages", required: false })
  @IsString()
  @IsOptional()
  webhookUrl?: string
}

export class CreateInstagramChannelDto {
  @ApiProperty({ enum: ["INSTAGRAM"] })
  @IsString()
  @IsNotEmpty()
  type: "INSTAGRAM"

  @ApiProperty({ description: "Channel display name" })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ type: InstagramChannelConfig })
  @ValidateNested()
  @Type(() => InstagramChannelConfig)
  config: InstagramChannelConfig
}