#!/bin/bash

echo "🔍 Facebook Webhook Debugging..."
echo ""

# 1. Test if ngrok URL is accessible
echo "1️⃣ Testing ngrok URL accessibility..."
curl -s "https://1124e994fc0c.ngrok-free.app/webhook/0180acbd-8e10-42a7-95bf-65b6872380de?hub.mode=subscribe&hub.verify_token=facebook_verify_token_123&hub.challenge=test123"
echo ""
echo ""

# 2. Check webhook subscription details
echo "2️⃣ Checking webhook subscription details..."
curl -s "https://graph.facebook.com/v18.0/1831081534952935/subscriptions?access_token=1831081534952935|9c1835a21525dcfbd881fca719e52744" | jq '.data[] | select(.object == "page") | {object, callback_url, active, fields: [.fields[] | select(.name == "messages" or .name == "messaging_postbacks")]}'
echo ""

# 3. Check if page is connected to app
echo "3️⃣ Checking if page is connected to app..."
curl -s "https://graph.facebook.com/v18.0/780005311871882/subscribed_apps?access_token=EAAaBWZBRyFecBPxVuHUkcpXZB1DiYK4ivJdYQZAb7Okt0ZAduNrbN2VmJ8jUkHsPw2xmWHY2V5i3q8ppIMFcO7Coef5WJDg8mO44NZBWoqEteCjQKdgjrrc0aeowDR8hGGO4Dkc1HQQcj46ML4zWqUJnvnprLZA4r3dSxfBZB8qoHooBTSix9Ejcr2ujLTRXnRQi6ZBH56Xv" | jq '.'
echo ""

# 4. Subscribe page to app (if not subscribed)
echo "4️⃣ Subscribing page to app..."
curl -X POST "https://graph.facebook.com/v18.0/780005311871882/subscribed_apps" \
  -d "subscribed_fields=messages,messaging_postbacks,messaging_optins,message_deliveries" \
  -d "access_token=EAAaBWZBRyFecBPxVuHUkcpXZB1DiYK4ivJdYQZAb7Okt0ZAduNrbN2VmJ8jUkHsPw2xmWHY2V5i3q8ppIMFcO7Coef5WJDg8mO44NZBWoqEteCjQKdgjrrc0aeowDR8hGGO4Dkc1HQQcj46ML4zWqUJnvnprLZA4r3dSxfBZB8qoHooBTSix9Ejcr2ujLTRXnRQi6ZBH56Xv"
echo ""
echo ""

echo "✅ Debug complete. If step 4 shows success:true, try sending a Facebook message again."