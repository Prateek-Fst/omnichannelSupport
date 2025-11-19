import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendInviteDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: 'AGENT', enum: ['ADMIN', 'AGENT'] })
  @IsEnum(['ADMIN', 'AGENT'])
  @IsNotEmpty()
  role: string
}