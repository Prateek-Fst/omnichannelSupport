import { NestFactory } from "@nestjs/core"
import { ValidationPipe, BadRequestException } from "@nestjs/common"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import helmet from "helmet"
import { AppModule } from "./app.module"
import { logger } from "./common/logger"

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  })

  app.use(helmet())
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "DENY")
    res.setHeader("X-XSS-Protection", "1; mode=block")
    next()
  })

  // app.useGlobalPipes is being called here
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => `${error.property}: ${Object.values(error.constraints).join(", ")}`)
        return new BadRequestException(messages)
      },
    }),
  )

  const config = new DocumentBuilder()
    .setTitle("DelightChat API")
    .setDescription("Multi-tenant omni-channel helpdesk API")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("organisations", "Organisation management")
    .addTag("users", "User management")
    .addTag("channels", "Channel management")
    .addTag("tickets", "Ticket management")
    .addTag("messages", "Message management")
    .addTag("campaigns", "Campaign management")
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api/docs", app, document)

  const port = process.env.PORT || 3000
  await app.listen(port)

  logger.info(`Application running on port ${port}`)
  logger.info(`API Documentation available at http://localhost:${port}/api/docs`)
}

bootstrap().catch((err) => {
  logger.error(err)
  process.exit(1)
})
