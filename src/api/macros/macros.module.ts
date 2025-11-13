import { Module } from "@nestjs/common"
import { MacrosService } from "./macros.service"
import { MacrosController } from "./macros.controller"

@Module({
  providers: [MacrosService],
  controllers: [MacrosController],
})
export class MacrosModule {}
