import { Test, type TestingModule } from "@nestjs/testing"
import { type INestApplication, ValidationPipe } from "@nestjs/common"
import * as request from "supertest"
import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/common/prisma/prisma.service"
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"

describe("Auth E2E Tests", () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    prisma = moduleFixture.get<PrismaService>(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /auth/signup", () => {
    it("should create org and admin user", async () => {
      const res = await request(app.getHttpServer()).post("/auth/signup").send({
        orgName: "Test Org",
        name: "Admin User",
        email: "admin@test.com",
        password: "password123",
      })

      expect(res.status).toBe(201)
      expect(res.body.user.email).toBe("admin@test.com")
      expect(res.body.user.role).toBe("ADMIN")
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
    })

    it("should reject duplicate email", async () => {
      await request(app.getHttpServer()).post("/auth/signup").send({
        orgName: "Test Org 1",
        name: "User 1",
        email: "duplicate@test.com",
        password: "password123",
      })

      const res = await request(app.getHttpServer()).post("/auth/signup").send({
        orgName: "Test Org 2",
        name: "User 2",
        email: "duplicate@test.com",
        password: "password123",
      })

      expect(res.status).toBe(400)
    })
  })

  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      await request(app.getHttpServer()).post("/auth/signup").send({
        orgName: "Login Test Org",
        name: "Test User",
        email: "login@test.com",
        password: "password123",
      })

      const res = await request(app.getHttpServer()).post("/auth/login").send({
        email: "login@test.com",
        password: "password123",
      })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
    })

    it("should reject invalid password", async () => {
      await request(app.getHttpServer()).post("/auth/signup").send({
        orgName: "Wrong Pass Org",
        name: "Test User",
        email: "wrong@test.com",
        password: "password123",
      })

      const res = await request(app.getHttpServer()).post("/auth/login").send({
        email: "wrong@test.com",
        password: "wrongpassword",
      })

      expect(res.status).toBe(401)
    })
  })

  describe("GET /auth/me", () => {
    it("should return current user", async () => {
      const signup = await request(app.getHttpServer()).post("/auth/signup").send({
        orgName: "Me Test Org",
        name: "Me User",
        email: "me@test.com",
        password: "password123",
      })

      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${signup.body.accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.email).toBe("me@test.com")
    })

    it("should reject without token", async () => {
      const res = await request(app.getHttpServer()).get("/auth/me")

      expect(res.status).toBe(401)
    })
  })
})
