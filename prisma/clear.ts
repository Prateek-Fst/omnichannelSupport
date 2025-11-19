import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config()
const prisma = new PrismaClient()

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database...')
    
    // Delete in reverse order of dependencies
    await prisma.auditLog.deleteMany()
    await prisma.ticketStatistics.deleteMany()
    await prisma.campaignRecipient.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.macro.deleteMany()
    await prisma.message.deleteMany()
    await prisma.ticket.deleteMany()
    await prisma.channel.deleteMany()
    await prisma.invite.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organisation.deleteMany()
    
    console.log('✅ Database cleared successfully!')
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()