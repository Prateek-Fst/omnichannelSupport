const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupInstagram() {
  console.log('Setting up Instagram channel...')
  
  // You need to get these from Facebook Developer Console
  const INSTAGRAM_CONFIG = {
    pageId: 'YOUR_INSTAGRAM_BUSINESS_ID',           // Get from Instagram Business Account
    accessToken: 'YOUR_INSTAGRAM_ACCESS_TOKEN',     // Get from Facebook App
    appSecret: 'YOUR_FACEBOOK_APP_SECRET',          // Get from Facebook App
    webhookVerifyToken: 'YOUR_WEBHOOK_VERIFY_TOKEN' // Set this yourself
  }
  
  try {
    // Find existing Instagram channel or create new one
    let channel = await prisma.channel.findFirst({
      where: { type: 'INSTAGRAM' }
    })
    
    if (channel) {
      // Update existing channel
      channel = await prisma.channel.update({
        where: { id: channel.id },
        data: {
          config: INSTAGRAM_CONFIG,
          isActive: true
        }
      })
      console.log('Updated Instagram channel:', channel.id)
    } else {
      // Create new Instagram channel
      const org = await prisma.organisation.findFirst()
      channel = await prisma.channel.create({
        data: {
          orgId: org.id,
          type: 'INSTAGRAM',
          name: 'Instagram Business',
          config: INSTAGRAM_CONFIG,
          isActive: true
        }
      })
      console.log('Created Instagram channel:', channel.id)
    }
    
    console.log('\n🚨 IMPORTANT: Update the config above with your real Instagram credentials!')
    console.log('\nTo get Instagram credentials:')
    console.log('1. Create Facebook App: https://developers.facebook.com/apps/')
    console.log('2. Add Instagram Basic Display product')
    console.log('3. Get Instagram Business Account ID')
    console.log('4. Generate access token with instagram_basic scope')
    console.log('5. Set up webhook URL: http://your-domain.com/webhook/' + channel.id)
    
  } catch (error) {
    console.error('Error setting up Instagram:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupInstagram()