import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateTelegramChannelDto {
  @ApiProperty({ example: 'TELEGRAM' })
  @IsString()
  @IsNotEmpty()
  type: string

  @ApiProperty({ example: 'My Telegram Bot' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: {
      botToken: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
      botUsername: 'mybot',
      webhookSecret: 'my-secret-token'
    }
  })
  config: {
    botToken: string
    botUsername?: string
    webhookSecret?: string
  }
}