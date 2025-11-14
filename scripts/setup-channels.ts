#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function setupChannels() {
  console.log('🚀 DelightChat Channel Setup Wizard\n')
  
  // Get organization
  const orgs = await prisma.organisation.findMany()
  if (orgs.length === 0) {
    console.log('❌ No organizations found. Please run signup first.')
    process.exit(1)
  }
  
  console.log('Available Organizations:')
  orgs.forEach((org, index) => {
    console.log(`${index + 1}. ${org.name} (${org.id})`)
  })
  
  const orgChoice = await question('\nSelect organization (number): ')
  const selectedOrg = orgs[parseInt(orgChoice) - 1]
  
  if (!selectedOrg) {
    console.log('❌ Invalid organization selection')
    process.exit(1)
  }
  
  console.log(`\n✅ Selected: ${selectedOrg.name}\n`)
  
  while (true) {
    console.log('\n📡 Available Channel Types:')
    console.log('1. WhatsApp Business')
    console.log('2. Instagram Business') 
    console.log('3. Facebook Messenger')
    console.log('4. Twitter')
    console.log('5. LinkedIn')
    console.log('6. Mock (for testing)')
    console.log('0. Exit')
    
    const choice = await question('\nSelect channel type: ')
    
    if (choice === '0') break
    
    switch (choice) {
      case '1':
        await setupWhatsApp(selectedOrg.id)
        break
      case '2':
        await setupInstagram(selectedOrg.id)
        break
      case '3':
        await setupFacebook(selectedOrg.id)
        break
      case '4':
        await setupTwitter(selectedOrg.id)
        break
      case '5':
        await setupLinkedIn(selectedOrg.id)
        break
      case '6':
        await setupMock(selectedOrg.id)
        break
      default:
        console.log('❌ Invalid choice')
    }
  }
  
  rl.close()
  await prisma.$disconnect()
}

async function setupWhatsApp(orgId: string) {
  console.log('\n📱 WhatsApp Business Setup')
  console.log('You need: Phone Number ID, Access Token, App Secret')
  console.log('Get these from: https://developers.facebook.com/\n')
  
  const name = await question('Channel name: ')
  const phoneNumberId = await question('Phone Number ID: ')
  const accessToken = await question('Access Token: ')
  const appSecret = await question('App Secret: ')
  
  try {
    const channel = await prisma.channel.create({
      data: {
        orgId,
        type: 'WHATSAPP',
        name,
        config: {
          phoneNumberId,
          accessToken,
          appSecret
        }
      }
    })
    
    console.log(`✅ WhatsApp channel created: ${channel.id}`)
    console.log(`📍 Webhook URL: https://yourdomain.com/webhook/${channel.id}`)
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function setupInstagram(orgId: string) {
  console.log('\n📸 Instagram Business Setup')
  const name = await question('Channel name: ')
  const pageId = await question('Facebook Page ID: ')
  const accessToken = await question('Page Access Token: ')
  const appSecret = await question('App Secret: ')
  
  try {
    const channel = await prisma.channel.create({
      data: {
        orgId,
        type: 'INSTAGRAM',
        name,
        config: { pageId, accessToken, appSecret }
      }
    })
    console.log(`✅ Instagram channel created: ${channel.id}`)
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function setupFacebook(orgId: string) {
  console.log('\n👥 Facebook Messenger Setup')
  const name = await question('Channel name: ')
  const pageId = await question('Facebook Page ID: ')
  const accessToken = await question('Page Access Token: ')
  const appSecret = await question('App Secret: ')
  
  try {
    const channel = await prisma.channel.create({
      data: {
        orgId,
        type: 'FACEBOOK',
        name,
        config: { pageId, accessToken, appSecret }
      }
    })
    console.log(`✅ Facebook channel created: ${channel.id}`)
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function setupTwitter(orgId: string) {
  console.log('\n🐦 Twitter Setup')
  const name = await question('Channel name: ')
  const apiKey = await question('API Key: ')
  const apiSecret = await question('API Secret: ')
  
  try {
    const channel = await prisma.channel.create({
      data: {
        orgId,
        type: 'TWITTER',
        name,
        config: { apiKey, apiSecret }
      }
    })
    console.log(`✅ Twitter channel created: ${channel.id}`)
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function setupLinkedIn(orgId: string) {
  console.log('\n💼 LinkedIn Setup')
  const name = await question('Channel name: ')
  const clientId = await question('Client ID: ')
  const clientSecret = await question('Client Secret: ')
  
  try {
    const channel = await prisma.channel.create({
      data: {
        orgId,
        type: 'LINKEDIN',
        name,
        config: { clientId, clientSecret }
      }
    })
    console.log(`✅ LinkedIn channel created: ${channel.id}`)
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function setupMock(orgId: string) {
  console.log('\n🧪 Mock Channel Setup (for testing)')
  const name = await question('Channel name: ')
  
  try {
    const channel = await prisma.channel.create({
      data: {
        orgId,
        type: 'MOCK',
        name,
        config: { apiKey: 'mock-key' }
      }
    })
    console.log(`✅ Mock channel created: ${channel.id}`)
    console.log(`📍 Webhook URL: https://yourdomain.com/webhook/${channel.id}`)
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

setupChannels().catch(console.error)