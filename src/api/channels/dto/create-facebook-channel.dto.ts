import { IsString, IsNotEmpty, ValidateNested, IsOptional } from "class-validator"
import { Type } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"

class FacebookChannelConfig {
  @ApiProperty({ description: "Facebook Page ID" })
  @IsString()
  @IsNotEmpty()
  facebookPageId: string

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

  @ApiProperty({ description: "Webhook URL for receiving Facebook messages" })
  @IsString()
  @IsNotEmpty()
  webhookUrl: string
}

export class CreateFacebookChannelDto {
  @ApiProperty({ enum: ["FACEBOOK"] })
  @IsString()
  @IsNotEmpty()
  type: "FACEBOOK"

  @ApiProperty({ description: "Channel display name" })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ type: FacebookChannelConfig })
  @ValidateNested()
  @Type(() => FacebookChannelConfig)
  config: FacebookChannelConfig
}