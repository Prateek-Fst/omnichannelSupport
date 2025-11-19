import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateEmailChannelDto {
  @ApiProperty({ example: 'EMAIL' })
  @IsString()
  @IsNotEmpty()
  type: string

  @ApiProperty({ example: 'Support Email' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: 'object',
    properties: {
      email: { type: 'string', example: 'support@company.com' },
      password: { type: 'string', example: 'app-password' },
      smtpHost: { type: 'string', example: 'smtp.gmail.com' },
      smtpPort: { type: 'number', example: 587 },
      imapHost: { type: 'string', example: 'imap.gmail.com' },
      imapPort: { type: 'number', example: 993 }
    }
  })
  config: {
    email: string
    password: string
    smtpHost: string
    smtpPort: number
    imapHost?: string
    imapPort?: number
  }
}