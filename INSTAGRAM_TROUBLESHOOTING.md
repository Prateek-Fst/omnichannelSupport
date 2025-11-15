# Instagram Integration Troubleshooting Guide

## Issue: No Messages Received from Instagram DMs

Your credentials look correct, but Instagram isn't sending webhooks to your backend. Here's how to diagnose and fix:

## Step 1: Test Your Channel Connection

Use the new test endpoint to verify your credentials:

```bash
# After creating your Instagram channel, test the connection
POST /orgs/{orgId}/channels/{channelId}/test-connection
```

This will check:
- ✅ Facebook Page access with your token
- ✅ Instagram Business Account access  
- ✅ Webhook subscription status

## Step 2: Check Webhook Subscription

The main issue is likely that Instagram webhooks aren't subscribed to your endpoint. You need to:

### 2.1 Subscribe to Instagram Webhooks

```bash
# Subscribe your app to Instagram webhooks
curl -X POST "https://graph.facebook.com/v18.0/1831081534952935/subscriptions" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "callback_url": "https://43ad9a23bb45.ngrok-free.app/webhook/{YOUR_CHANNEL_ID}",
    "verify_token": "instagram_verify_token_123",
    "fields": "messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads"
  }' \
  -G -d "access_token=EAAaBWZBRyFecBPyx3NnOPZBiOdidBxZBESA4qLI0O9ojZB9GfmAUGuwZBv74JLlpKZBzZA9jwW7Obn6FO0Kv2za9RT9cizjawZB7PXddqR2AFQYcn1zu6s7sxCT7vob0H6HXkdfky7PKImM52fZBEa3hT4IZCEshP2CdJ5rFKYZA8nzAS1cUzH54FC75X8vFOdD"
```

### 2.2 Verify Webhook Subscription

```bash
# Check current subscriptions
curl "https://graph.facebook.com/v18.0/1831081534952935/subscriptions?access_token=EAAaBWZBRyFecBPyx3NnOPZBiOdidBxZBESA4qLI0O9ojZB9GfmAUGuwZBv74JLlpKZBzZA9jwW7Obn6FO0Kv2za9RT9cizjawZB7PXddqR2AFQYcn1zu6s7sxCT7vob0H6HXkdfky7PKImM52fZBEa3hT4IZCEshP2CdJ5rFKYZA8nzAS1cUzH54FC75X8vFOdD"
```

## Step 3: Test Webhook Endpoint

### 3.1 Test Webhook Verification
```bash
# This should return "test_challenge_123"
curl "http://localhost:3001/webhook/{YOUR_CHANNEL_ID}?hub.mode=subscribe&hub.verify_token=instagram_verify_token_123&hub.challenge=test_challenge_123"
```

### 3.2 Test Mock Message
```bash
# Send a test message to verify the pipeline works
curl -X POST http://localhost:3001/webhook/{YOUR_CHANNEL_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "senderPhone": "test_user_123",
    "senderName": "Test User",
    "message": "Test message from troubleshooting",
    "messageId": "test_msg_123"
  }'
```

## Step 4: Check Logs

With the enhanced logging, you should see:

### Webhook Controller Logs:
```
🔐 Webhook verification attempt: { channelId, mode, verifyToken, challenge }
✅ Webhook verified successfully for channel: {channelId}
📨 Webhook received for channel: {channelId}
📋 Channel found: { channelId, type, orgId, isActive }
🔐 Signature verification: { valid, hasSignature, hasAppSecret }
🔄 Parsing webhook message...
✅ Message parsed successfully: { externalMessageId, senderName, content }
🚀 Message queued for processing from channel: {channelId}
```

### Inbound Worker Logs:
```
🔄 Processing inbound message: {jobId}
📱 Channel found: { channelId, type, orgId }
👤 Auto-created customer: {customerId}
🎫 Auto-created ticket: {ticketId}
✅ Inbound message processed successfully
```

## Step 5: Facebook App Configuration

Make sure your Facebook App has:

### Required Products:
- ✅ Instagram Basic Display
- ✅ Webhooks

### Required Permissions:
- ✅ `instagram_basic`
- ✅ `pages_messaging`
- ✅ `pages_manage_metadata`

### Webhook Configuration:
- ✅ Object: `instagram`
- ✅ Callback URL: `https://43ad9a23bb45.ngrok-free.app/webhook/{channelId}`
- ✅ Verify Token: `instagram_verify_token_123`
- ✅ Fields: `messages`, `messaging_postbacks`, `messaging_optins`

## Step 6: Instagram Business Account Setup

Ensure:
- ✅ Instagram account is converted to Business Account
- ✅ Connected to your Facebook Page (ID: 780005311871882)
- ✅ Page has Instagram messaging enabled

## Quick Diagnosis Commands

### 1. Test Channel Connection
```bash
# Use Postman: POST /orgs/{orgId}/channels/{channelId}/test-connection
# This will show exactly what's wrong with your setup
```

### 2. Check Webhook Subscriptions
```bash
curl "https://graph.facebook.com/v18.0/1831081534952935/subscriptions?access_token={YOUR_TOKEN}"
```

### 3. Test Webhook Verification
```bash
curl "http://localhost:3001/webhook/{channelId}?hub.mode=subscribe&hub.verify_token=instagram_verify_token_123&hub.challenge=test"
```

### 4. Send Test Message
```bash
curl -X POST http://localhost:3001/webhook/{channelId} \
  -H "Content-Type: application/json" \
  -d '{"senderPhone": "test", "senderName": "Test", "message": "Hello"}'
```

## Common Issues & Solutions

### Issue: "Channel not found"
**Solution**: Make sure you're using the correct `channelId` from the channel creation response

### Issue: "Invalid verify token"  
**Solution**: Ensure `webhookVerifyToken` in your channel config matches what you use in webhook subscription

### Issue: "Invalid signature"
**Solution**: Check that `appSecret` in your channel config matches your Facebook App Secret

### Issue: No webhook subscription found
**Solution**: You need to manually subscribe to Instagram webhooks using the Facebook Graph API

### Issue: Webhook verification fails
**Solution**: Make sure your ngrok URL is accessible and the verify token matches

## Expected Workflow

1. **Create Instagram Channel** ✅ (You've done this)
2. **Subscribe to Webhooks** ❌ (This is missing)
3. **Test Webhook Verification** ❌ (Do this next)
4. **Send Instagram DM** ❌ (Will work after webhook subscription)
5. **See Logs in Inbound Worker** ❌ (Will work after webhook subscription)

## Next Steps

1. **Use the test connection endpoint** to verify your credentials
2. **Subscribe to Instagram webhooks** using the curl command above
3. **Test webhook verification** with the provided curl command
4. **Send a test DM** to your Instagram account
5. **Check the enhanced logs** for detailed debugging info

The issue is most likely that Instagram webhooks aren't subscribed to your endpoint. Once you subscribe using the Facebook Graph API, messages should start flowing through!