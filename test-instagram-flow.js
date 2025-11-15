#!/usr/bin/env node

/**
 * Instagram Integration Test Script
 * Tests the complete flow: signup → create channel → send webhook → verify customer/ticket creation
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const NGROK_URL = 'https://43ad9a23bb45.ngrok-free.app';

let accessToken = '';
let orgId = '';
let channelId = '';
let customerId = '';
let ticketId = '';

async function makeRequest(method, endpoint, body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`${method} ${url}`);
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Request failed:', response.status, data);
    throw new Error(`Request failed: ${response.status}`);
  }
  
  return data;
}

async function step1_createOrganization() {
  console.log('\n🏢 Step 1: Creating Organization...');
  
  const response = await makeRequest('POST', '/auth/signup', {
    orgName: 'Instagram Test Company',
    name: 'Test Admin',
    email: 'admin@instagramtest.com',
    password: 'password123'
  });
  
  accessToken = response.accessToken;
  orgId = response.user.orgId;
  
  console.log('✅ Organization created');
  console.log('   Org ID:', orgId);
  console.log('   Access Token:', accessToken.substring(0, 20) + '...');
}

async function step2_createInstagramChannel() {
  console.log('\n📱 Step 2: Creating Instagram Channel...');
  
  const response = await makeRequest('POST', `/orgs/${orgId}/channels`, {
    type: 'INSTAGRAM',
    name: 'Instagram Business Account',
    config: {
      facebookPageId: 'TEST_FACEBOOK_PAGE_ID_123',
      instagramAccountId: 'TEST_INSTAGRAM_ACCOUNT_ID_456',
      pageAccessToken: 'TEST_PAGE_ACCESS_TOKEN',
      appSecret: 'TEST_APP_SECRET',
      appId: 'TEST_APP_ID_789',
      webhookVerifyToken: 'instagram_verify_token_123',
      webhookUrl: `${NGROK_URL}/webhook`
    }
  }, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  channelId = response.id;
  
  console.log('✅ Instagram channel created');
  console.log('   Channel ID:', channelId);
}

async function step3_testWebhookVerification() {
  console.log('\n🔐 Step 3: Testing Webhook Verification...');
  
  const response = await fetch(`${BASE_URL}/webhook/${channelId}?hub.mode=subscribe&hub.verify_token=instagram_verify_token_123&hub.challenge=test_challenge_123`);
  const challenge = await response.text();
  
  if (challenge === 'test_challenge_123') {
    console.log('✅ Webhook verification successful');
  } else {
    throw new Error('Webhook verification failed');
  }
}

async function step4_sendMockInstagramMessage() {
  console.log('\n💬 Step 4: Sending Mock Instagram Message...');
  
  const response = await makeRequest('POST', `/webhook/${channelId}`, {
    senderPhone: 'instagram_user_456',
    senderName: 'Jane Smith',
    message: 'Hi! I have a question about your product pricing.',
    messageId: 'ig_msg_456',
    metadata: {
      platform: 'instagram',
      type: 'direct_message'
    }
  });
  
  console.log('✅ Mock Instagram message sent');
  
  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function step5_verifyCustomerCreation() {
  console.log('\n👤 Step 5: Verifying Customer Creation...');
  
  const customers = await makeRequest('GET', `/orgs/${orgId}/customers?platform=INSTAGRAM`, null, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  if (customers.length === 0) {
    throw new Error('No customers found');
  }
  
  customerId = customers[0].id;
  
  console.log('✅ Customer auto-created');
  console.log('   Customer ID:', customerId);
  console.log('   Customer Name:', customers[0].name);
  console.log('   Platform:', customers[0].platform);
  console.log('   External ID:', customers[0].externalId);
}

async function step6_verifyTicketCreation() {
  console.log('\n🎫 Step 6: Verifying Ticket Creation...');
  
  const tickets = await makeRequest('GET', `/orgs/${orgId}/tickets?channelId=${channelId}`, null, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  if (tickets.length === 0) {
    throw new Error('No tickets found');
  }
  
  ticketId = tickets[0].id;
  
  console.log('✅ Ticket auto-created');
  console.log('   Ticket ID:', ticketId);
  console.log('   Subject:', tickets[0].subject);
  console.log('   Status:', tickets[0].status);
}

async function step7_getTicketMessages() {
  console.log('\n📨 Step 7: Getting Ticket Messages...');
  
  const messages = await makeRequest('GET', `/orgs/${orgId}/tickets/${ticketId}/messages`, null, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  console.log('✅ Messages retrieved');
  console.log('   Message Count:', messages.length);
  if (messages.length > 0) {
    console.log('   First Message:', messages[0].content);
    console.log('   Direction:', messages[0].direction);
  }
}

async function step8_sendReply() {
  console.log('\n↩️  Step 8: Sending Reply...');
  
  const response = await makeRequest('POST', `/orgs/${orgId}/tickets/${ticketId}/messages`, {
    content: 'Thank you for your message! Our team will get back to you shortly.',
    direction: 'OUTBOUND'
  }, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  console.log('✅ Reply sent');
  console.log('   Message ID:', response.id);
}

async function step9_checkNotifications() {
  console.log('\n🔔 Step 9: Checking Notifications...');
  
  const notifications = await makeRequest('GET', `/orgs/${orgId}/notifications`, null, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  console.log('✅ Notifications retrieved');
  console.log('   Notification Count:', notifications.length);
  if (notifications.length > 0) {
    console.log('   Latest Notification:', notifications[0].title);
    console.log('   Type:', notifications[0].type);
  }
}

async function step10_testRealInstagramFormat() {
  console.log('\n📱 Step 10: Testing Real Instagram Message Format...');
  
  const response = await makeRequest('POST', `/webhook/${channelId}`, {
    object: 'instagram',
    entry: [{
      id: 'PAGE_ID',
      time: Date.now(),
      messaging: [{
        sender: { id: 'real_instagram_user_789' },
        recipient: { id: 'PAGE_ID' },
        timestamp: Date.now(),
        message: {
          mid: 'REAL_MESSAGE_ID',
          text: 'This is a real Instagram message format test!'
        }
      }]
    }]
  }, {
    'x-hub-signature-256': 'sha256=test_signature'
  });
  
  console.log('✅ Real Instagram format message sent');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function runFullTest() {
  console.log('🚀 Starting Instagram Integration Test...\n');
  
  try {
    await step1_createOrganization();
    await step2_createInstagramChannel();
    await step3_testWebhookVerification();
    await step4_sendMockInstagramMessage();
    await step5_verifyCustomerCreation();
    await step6_verifyTicketCreation();
    await step7_getTicketMessages();
    await step8_sendReply();
    await step9_checkNotifications();
    await step10_testRealInstagramFormat();
    
    console.log('\n🎉 All tests passed! Instagram integration is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   Organization ID: ${orgId}`);
    console.log(`   Channel ID: ${channelId}`);
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Ticket ID: ${ticketId}`);
    console.log(`   Webhook URL: ${BASE_URL}/webhook/${channelId}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runFullTest();
}

module.exports = {
  runFullTest,
  BASE_URL,
  NGROK_URL
};