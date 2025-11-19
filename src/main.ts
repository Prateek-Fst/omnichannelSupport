import { NestFactory } from "@nestjs/core"
import { ValidationPipe, BadRequestException } from "@nestjs/common"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import helmet from "helmet"
import { AppModule } from "./app.module"
import { logger } from "./common/logger"

async function bootstrap() {
  try {
    console.log("Starting NestJS application...")
    
    const app = await NestFactory.create(AppModule, {
      logger: console,
    })

    console.log("NestJS app created successfully")

    // Enable CORS for frontend
    app.enableCors({
      origin: ['http://localhost:3001', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
      credentials: true,
    })

    app.use(helmet())
    app.use((req: any, res: any, next: any) => {
      res.setHeader("X-Content-Type-Options", "nosniff")
      res.setHeader("X-Frame-Options", "DENY")
      res.setHeader("X-XSS-Protection", "1; mode=block")
      next()
    })

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors: any) => {
            const messages = errors.map((error: any) => {
            const constraints = error.constraints || {}
            return `${error.property}: ${Object.values(constraints).join(", ")}`
          })
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
    console.log(`Attempting to listen on port ${port}...`)
    
    await app.listen(port)

    console.log(`✅ Application running on port ${port}`)
    console.log(`📚 API Documentation available at http://localhost:${port}/api/docs`)
    
    logger.info(`Application running on port ${port}`)
    logger.info(`API Documentation available at http://localhost:${port}/api/docs`)
  } catch (error: any) {
    console.error("❌ Failed to start application:", error)
    logger.error("Failed to start application: " + error.message)
    process.exit(1)
  }
}

bootstrap().catch((err: any) => {
  console.error("❌ Bootstrap failed:", err)
  logger.error("Bootstrap failed: " + err.message)
  process.exit(1)
})