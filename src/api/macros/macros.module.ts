import { Module } from "@nestjs/common"
import { MacrosService } from "./macros.service"
import { MacrosController } from "./macros.controller"
import { PrismaModule } from "../../common/prisma/prisma.module"

@Module({
  imports: [PrismaModule],
  providers: [MacrosService],
  controllers: [MacrosController],
})
export class MacrosModule {}
