# Facebook Webhook Setup & Troubleshooting

## Current Status Check

Your Facebook channel config looks correct:
```json
{
  "facebookPageId": "780005311871882",
  "pageAccessToken": "EAAaBWZBRyFecBP49eXOziWZBpaEQqMRZAS2uXtrGSeZC5YirtAOzBhdoynSrOPbsqQEjOGRrdJ5cCjwsWPbGmqeZCQz3n0loUMUZA7ACrgzI806BOr5ZA7LBg7YjnvZAgVueSAyLxIHl62Go0mFhQXwkV3ZAtEe66Q3ZBQtn7c9WKB5z5ziTmq7V5GxgLN99gsF24tksknLBSa4W3TckYkzBTaNjPZB9ZA3FdQjpDDTfOcCMTMcH",
  "appSecret": "9c1835a21525dcfbd881fca719e52744",
  "appId": "1831081534952935",
  "webhookVerifyToken": "facebook_verify_token_123"
}
```

## What Should Happen When Someone DMs Your Facebook Page:

### 1. Facebook Sends Webhook → Your Backend
```
POST https://43ad9a23bb45.ngrok-free.app/webhook/{YOUR_FACEBOOK_CHANNEL_ID}
```

### 2. Expected Webhook Payload:
```json
{
  "object": "page",
  "entry": [
    {
      "id": "780005311871882",
      "time": 1234567890,
      "messaging": [
        {
          "sender": { "id": "USER_ID" },
          "recipient": { "id": "780005311871882" },
          "timestamp": 1234567890,
          "message": {
            "mid": "MESSAGE_ID",
            "text": "Hello from Facebook!"
          }
        }
      ]
    }
  ]
}
```

### 3. Backend Processing:
- ✅ **Webhook received** → Logs: "📨 Webhook received for channel"
- ✅ **Facebook connector parses** → Logs: "FacebookConnector: Parsing webhook"
- ✅ **Customer auto-created** → Logs: "👤 Auto-created customer"
- ✅ **Ticket auto-created** → Logs: "🎫 Auto-created ticket"
- ✅ **Notification sent** → Logs: "✅ Inbound message processed successfully"

## Missing Setup: Facebook Webhook Subscription

**This is likely why nothing happened!** You need to subscribe your Facebook App to Page webhooks:

### Step 1: Subscribe to Page Webhooks
```bash
curl -X POST "https://graph.facebook.com/v18.0/1831081534952935/subscriptions" \
  -d "object=page" \
  -d "callback_url=https://43ad9a23bb45.ngrok-free.app/webhook/{YOUR_FACEBOOK_CHANNEL_ID}" \
  -d "verify_token=facebook_verify_token_123" \
  -d "fields=messages,messaging_postbacks,feed" \
  -d "access_token=EAAaBWZBRyFecBP49eXOziWZBpaEQqMRZAS2uXtrGSeZC5YirtAOzBhdoynSrOPbsqQEjOGRrdJ5cCjwsWPbGmqeZCQz3n0loUMUZA7ACrgzI806BOr5ZA7LBg7YjnvZAgVueSAyLxIHl62Go0mFhQXwkV3ZAtEe66Q3ZBQtn7c9WKB5z5ziTmq7V5GxgLN99gsF24tksknLBSa4W3TckYkzBTaNjPZB9ZA3FdQjpDDTfOcCMTMcH"
```

### Step 2: Check Current Subscriptions
```bash
curl "https://graph.facebook.com/v18.0/1831081534952935/subscriptions?access_token=EAAaBWZBRyFecBP49eXOziWZBpaEQqMRZAS2uXtrGSeZC5YirtAOzBhdoynSrOPbsqQEjOGRrdJ5cCjwsWPbGmqeZCQz3n0loUMUZA7ACrgzI806BOr5ZA7LBg7YjnvZAgVueSAyLxIHl62Go0mFhQXwkV3ZAtEe66Q3ZBQtn7c9WKB5z5ziTmq7V5GxgLN99gsF24tksknLBSa4W3TckYkzBTaNjPZB9ZA3FdQjpDDTfOcCMTMcH"
```

## Debugging Steps:

### 1. Test Webhook Verification
```bash
curl "http://localhost:3001/webhook/{YOUR_FACEBOOK_CHANNEL_ID}?hub.mode=subscribe&hub.verify_token=facebook_verify_token_123&hub.challenge=test_challenge"
```
**Expected**: Returns `test_challenge`

### 2. Test Mock Facebook Message
```bash
curl -X POST http://localhost:3001/webhook/{YOUR_FACEBOOK_CHANNEL_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "senderPhone": "facebook_user_test",
    "senderName": "Test User",
    "message": "Test Facebook message",
    "messageId": "fb_test_123"
  }'
```

### 3. Test Real Facebook Format
```bash
curl -X POST http://localhost:3001/webhook/{YOUR_FACEBOOK_CHANNEL_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "780005311871882",
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "test_user_123"},
        "recipient": {"id": "780005311871882"},
        "timestamp": 1234567890,
        "message": {
          "mid": "test_message_id",
          "text": "Hello from Facebook test!"
        }
      }]
    }]
  }'
```

## Expected Logs (After Enhanced Logging):

```
📨 Webhook received for channel: {channelId}
📋 Channel found - type: FACEBOOK, orgId: {orgId}, isActive: true
🔐 Signature verification - valid: true
🔄 Parsing webhook message...
FacebookConnector: Parsing webhook
Facebook webhook body: {"object":"page","entry":[...]}
Facebook: Found messaging entry with 1 messages
Facebook messaging object: {"sender":{"id":"USER_ID"},...}
Facebook incoming message - sender ID: USER_ID, content: Hello!
✅ Message parsed - sender: USER_ID, content: Hello!, type: message
🚀 Message queued for processing from channel: {channelId}
```

## Inbound Worker Logs:
```
🔄 Processing inbound message: {jobId}
📱 Channel found - type: FACEBOOK, orgId: {orgId}
👤 Auto-created customer: {customerId} (FACEBOOK)
🎫 Auto-created ticket: {ticketId}
✅ Inbound message processed successfully
```

## Common Issues:

### Issue 1: No webhook subscription
**Solution**: Run the webhook subscription curl command above

### Issue 2: Wrong webhook URL
**Solution**: Make sure ngrok is running and URL is correct

### Issue 3: Facebook App not configured
**Solution**: Add Messenger product to your Facebook App

### Issue 4: Page not connected
**Solution**: Connect your Facebook Page to the App

## Quick Test:
1. **Get your Facebook channel ID** from the channel creation response
2. **Subscribe to webhooks** using the curl command above
3. **Send a DM** to your Facebook Page
4. **Check logs** - you should see the enhanced Facebook logging
5. **Verify customer/ticket creation** using the API endpoints

The Facebook connector is ready - you just need the webhook subscription! 🚀