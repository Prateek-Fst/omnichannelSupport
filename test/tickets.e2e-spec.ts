import { Test, type TestingModule } from "@nestjs/testing"
import { type INestApplication, ValidationPipe } from "@nestjs/common"
import * as request from "supertest"
import { AppModule } from "../src/app.module"
import { describe, beforeAll, afterAll, it, expect } from "@jest/globals"

describe("Tickets E2E Tests", () => {
  let app: INestApplication
  let orgId: string
  let adminToken: string
  let channelId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    // Create test org
    const signup = await request(app.getHttpServer()).post("/auth/signup").send({
      orgName: "Ticket Test Org",
      name: "Admin",
      email: "admin@ticket.com",
      password: "password123",
    })

    orgId = signup.body.user.orgId
    adminToken = signup.body.accessToken

    // Create channel
    const channelRes = await request(app.getHttpServer())
      .post(`/orgs/${orgId}/channels`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "MOCK",
        name: "Test Channel",
        config: { apiKey: "test-key" },
      })

    channelId = channelRes.body.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /orgs/:orgId/tickets", () => {
    it("should create ticket", async () => {
      const res = await request(app.getHttpServer())
        .post(`/orgs/${orgId}/tickets`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          channelId,
          subject: "Test Ticket",
          externalThreadId: "ext-123",
        })

      expect(res.status).toBe(201)
      expect(res.body.subject).toBe("Test Ticket")
      expect(res.body.status).toBe("OPEN")
    })
  })

  describe("GET /orgs/:orgId/tickets", () => {
    it("should list tickets", async () => {
      const res = await request(app.getHttpServer())
        .get(`/orgs/${orgId}/tickets`)
        .set("Authorization", `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe("PUT /orgs/:orgId/tickets/:ticketId", () => {
    it("should update ticket status", async () => {
      const ticketRes = await request(app.getHttpServer())
        .post(`/orgs/${orgId}/tickets`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          channelId,
          subject: "Update Test",
          externalThreadId: "ext-456",
        })

      const ticketId = ticketRes.body.id

      const res = await request(app.getHttpServer())
        .put(`/orgs/${orgId}/tickets/${ticketId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "CLOSED" })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe("CLOSED")
    })
  })
})
