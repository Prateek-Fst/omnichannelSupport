import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { v4 as uuid } from "uuid"

const prisma = new PrismaClient()

async function main() {
  // Create organisation
  const org = await prisma.organisation.create({
    data: {
      id: "org-demo-001",
      name: "Demo Organisation",
    },
  })

  console.log("Created organisation:", org)

  // Create admin user
  const adminPassword = await bcrypt.hash("admin@123", 10)
  const admin = await prisma.user.create({
    data: {
      id: "user-admin-001",
      orgId: org.id,
      name: "Admin User",
      email: "admin@demo.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  })

  console.log("Created admin user:", admin)

  // Create agent user
  const agentPassword = await bcrypt.hash("agent@123", 10)
  const agent = await prisma.user.create({
    data: {
      id: "user-agent-001",
      orgId: org.id,
      name: "Agent User",
      email: "agent@demo.com",
      passwordHash: agentPassword,
      role: "AGENT",
    },
  })

  console.log("Created agent user:", agent)

  // Create mock channel
  const mockChannel = await prisma.channel.create({
    data: {
      orgId: org.id,
      type: "MOCK",
      name: "Mock Channel",
      config: {
        apiKey: "mock-key-" + uuid(),
        webhookUrl: "http://localhost:3000/webhook/mock",
      },
      isActive: true,
    },
  })

  console.log("Created mock channel:", mockChannel)

  // Create sample macro
  const macro = await prisma.macro.create({
    data: {
      orgId: org.id,
      name: "Thank You",
      content: "Thank you for contacting us. We will get back to you shortly.",
      createdBy: admin.id,
    },
  })

  console.log("Created macro:", macro)

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
