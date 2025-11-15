# Instagram Integration Setup Guide

## Overview
This guide walks you through setting up Instagram integration with DelightChat backend for receiving DMs, comments, and story replies.

## Prerequisites
- Instagram Business Account
- Facebook Page connected to Instagram Business Account
- Facebook Developer Account
- ngrok or similar tunneling service for webhooks
- DelightChat backend running on localhost:3001

## Step 1: Facebook App Setup

### 1.1 Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App" → "Business" → Continue
3. Enter app name: "DelightChat Instagram Integration"
4. Enter contact email and select app purpose

### 1.2 Add Instagram Products
1. In your app dashboard, click "Add Product"
2. Add "Instagram Basic Display" 
3. Add "Instagram Messaging" (for DMs)
4. Add "Webhooks" (for real-time updates)

### 1.3 Configure Instagram Basic Display
1. Go to Instagram Basic Display → Basic Display
2. Add Instagram Test Users (your Instagram business account)
3. Configure OAuth Redirect URIs: `https://localhost/`

## Step 2: Get Instagram Access Token

### 2.1 Get Authorization Code
Visit this URL (replace {app-id} with your Facebook App ID):
```
https://api.instagram.com/oauth/authorize?client_id={app-id}&redirect_uri=https://localhost/&scope=user_profile,user_media&response_type=code
```

### 2.2 Exchange for Short-lived Token
```bash
curl -X POST \
  https://api.instagram.com/oauth/access_token \
  -F client_id={app-id} \
  -F client_secret={app-secret} \
  -F grant_type=authorization_code \
  -F redirect_uri=https://localhost/ \
  -F code={code-from-step-2.1}
```

### 2.3 Exchange for Long-lived Token
```bash
curl -X GET \
  "https://graph.facebook.com/access_token?grant_type=ig_exchange_token&client_secret={app-secret}&access_token={short-lived-token}"
```

## Step 3: Setup Webhooks

### 3.1 Configure ngrok
```bash
# Install ngrok if not already installed
# Start ngrok tunnel
ngrok http 3001

# Note the HTTPS URL (e.g., https://43ad9a23bb45.ngrok-free.app)
```

### 3.2 Configure Facebook Webhooks
1. In Facebook App → Webhooks
2. Click "Create Subscription" for Instagram
3. Callback URL: `https://your-ngrok-url.ngrok-free.app/webhook/{CHANNEL_ID}`
4. Verify Token: `instagram_verify_token_123` (or your custom token)
5. Subscribe to: `messages`, `messaging_postbacks`, `messaging_optins`

## Step 4: DelightChat Backend Setup

### 4.1 Update Environment Variables
```bash
# Add to your .env file
INSTAGRAM_API_KEY=your-instagram-access-token
```

### 4.2 Start Required Services
```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run database migrations
pnpm run db:push

# Start the API server
pnpm run start:dev

# In separate terminals, start workers
pnpm run worker:inbound
pnpm run worker:outbound
```

## Step 5: Create Instagram Channel via API

### 5.1 Create Organization & Login
Use the Postman collection or curl:

```bash
# Create organization
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Instagram Demo Company",
    "name": "Admin User", 
    "email": "admin@instagramdemo.com",
    "password": "password123"
  }'

# Save the accessToken and orgId from response
```

### 5.2 Create Instagram Channel
```bash
curl -X POST http://localhost:3001/orgs/{orgId}/channels \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSTAGRAM",
    "name": "Instagram Business Account",
    "config": {
      "pageId": "YOUR_INSTAGRAM_PAGE_ID",
      "accessToken": "YOUR_LONG_LIVED_ACCESS_TOKEN",
      "appSecret": "YOUR_APP_SECRET", 
      "webhookVerifyToken": "instagram_verify_token_123",
      "webhookUrl": "https://your-ngrok-url.ngrok-free.app/webhook"
    }
  }'

# Save the channelId from response
```

## Step 6: Test Integration

### 6.1 Test Webhook Verification
```bash
curl "http://localhost:3001/webhook/{channelId}?hub.mode=subscribe&hub.verify_token=instagram_verify_token_123&hub.challenge=test_challenge"
# Should return: test_challenge
```

### 6.2 Test Mock Instagram Message
```bash
curl -X POST http://localhost:3001/webhook/{channelId} \
  -H "Content-Type: application/json" \
  -d '{
    "senderPhone": "instagram_user_123",
    "senderName": "John Doe", 
    "message": "Hello! I need help with my order",
    "messageId": "ig_msg_123",
    "metadata": {
      "platform": "instagram",
      "type": "direct_message"
    }
  }'
```

### 6.3 Test Real Instagram DM Format
```bash
curl -X POST http://localhost:3001/webhook/{channelId} \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test_signature" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "PAGE_ID",
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "USER_ID_123"},
        "recipient": {"id": "PAGE_ID"},
        "timestamp": 1234567890,
        "message": {
          "mid": "MESSAGE_ID",
          "text": "Hi there! I have a question about your product."
        }
      }]
    }]
  }'
```

## Step 7: Verify Customer & Ticket Creation

### 7.1 Check Auto-created Customers
```bash
curl -X GET "http://localhost:3001/orgs/{orgId}/customers?platform=INSTAGRAM" \
  -H "Authorization: Bearer {accessToken}"
```

### 7.2 Check Auto-created Tickets  
```bash
curl -X GET "http://localhost:3001/orgs/{orgId}/tickets?channelId={channelId}" \
  -H "Authorization: Bearer {accessToken}"
```

### 7.3 Check Notifications
```bash
curl -X GET "http://localhost:3001/orgs/{orgId}/notifications" \
  -H "Authorization: Bearer {accessToken}"
```

## Step 8: Send Replies

### 8.1 Reply to Customer
```bash
curl -X POST "http://localhost:3001/orgs/{orgId}/tickets/{ticketId}/messages" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Thank you for reaching out! How can I help you today?",
    "direction": "OUTBOUND"
  }'
```

## Supported Instagram Features

### ✅ Currently Supported
- **Direct Messages**: Receive and send DMs
- **Story Replies**: Handle replies to Instagram stories  
- **Comments**: Receive comments on posts
- **Customer Auto-creation**: Automatic customer profiles from Instagram interactions
- **Ticket Management**: Auto-create tickets for conversations
- **Real-time Notifications**: Get notified of new messages/comments
- **Message History**: Full conversation history per customer

### 🔄 Webhook Events Handled
- `messages` - Direct messages and story replies
- `messaging_postbacks` - Button clicks and quick replies
- `comments` - Comments on posts
- `messaging_optins` - User opt-ins

### 📱 Message Types Supported
- Text messages
- Image/video attachments  
- Story replies
- Post comments
- Quick replies

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check verify token matches in channel config
   - Ensure ngrok URL is accessible
   - Verify channel ID in webhook URL

2. **Messages Not Received**
   - Check inbound worker is running: `pnpm run worker:inbound`
   - Verify webhook subscription in Facebook App
   - Check server logs for errors

3. **Sending Messages Fails**
   - Verify Instagram access token is valid and long-lived
   - Check page ID is correct
   - Ensure outbound worker is running: `pnpm run worker:outbound`

4. **Customer Not Created**
   - Check database connection
   - Verify orgId and channelId are correct
   - Check inbound worker logs

### Debug Commands

```bash
# Check worker status
docker-compose logs api
docker-compose logs redis

# Check database
npx prisma studio

# Test webhook manually
curl -X POST http://localhost:3001/webhook/{channelId} -d '{"test": true}'
```

## Production Deployment

### Security Considerations
1. Use HTTPS for webhook URLs
2. Validate webhook signatures properly
3. Store access tokens securely
4. Implement rate limiting
5. Monitor for token expiration

### Scaling
1. Use Redis cluster for high availability
2. Scale workers horizontally
3. Implement proper error handling and retries
4. Monitor queue performance

## API Reference

The complete API endpoints are available in the Postman collection. Key endpoints:

- `POST /auth/signup` - Create organization
- `POST /auth/login` - Login
- `POST /orgs/{orgId}/channels` - Create Instagram channel
- `GET /webhook/{channelId}` - Webhook verification
- `POST /webhook/{channelId}` - Receive Instagram webhooks
- `GET /orgs/{orgId}/customers` - List customers
- `GET /orgs/{orgId}/tickets` - List tickets
- `POST /orgs/{orgId}/tickets/{ticketId}/messages` - Send reply

Import the `postman-collection.json` file into Postman for a complete testing environment.