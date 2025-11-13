import { IsString, MinLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  token: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string
}
