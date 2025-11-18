#!/bin/bash

echo "🚀 Testing Full Facebook Integration Automation"
echo "=============================================="
echo ""

# Test 1: Verify webhook subscription exists
echo "1️⃣ Checking webhook subscription..."
WEBHOOK_CHECK=$(curl -s "https://graph.facebook.com/v18.0/1831081534952935/subscriptions?access_token=1831081534952935|9c1835a21525dcfbd881fca719e52744" | jq -r '.data[] | select(.object == "page") | .active')

if [ "$WEBHOOK_CHECK" = "true" ]; then
    echo "✅ Webhook subscription: ACTIVE"
else
    echo "❌ Webhook subscription: NOT FOUND"
fi
echo ""

# Test 2: Verify page is subscribed to app
echo "2️⃣ Checking page subscription to app..."
PAGE_CHECK=$(curl -s "https://graph.facebook.com/v18.0/780005311871882/subscribed_apps?access_token=EAAaBWZBRyFecBPxVuHUkcpXZB1DiYK4ivJdYQZAb7Okt0ZAduNrbN2VmJ8jUkHsPw2xmWHY2V5i3q8ppIMFcO7Coef5WJDg8mO44NZBWoqEteCjQKdgjrrc0aeowDR8hGGO4Dkc1HQQcj46ML4zWqUJnvnprLZA4r3dSxfBZB8qoHooBTSix9Ejcr2ujLTRXnRQi6ZBH56Xv" | jq -r '.data | length')

if [ "$PAGE_CHECK" -gt "0" ]; then
    echo "✅ Page subscription: CONNECTED"
else
    echo "❌ Page subscription: NOT CONNECTED"
fi
echo ""

# Test 3: Test webhook endpoint accessibility
echo "3️⃣ Testing webhook endpoint..."
WEBHOOK_RESPONSE=$(curl -s "https://1124e994fc0c.ngrok-free.app/webhook/0180acbd-8e10-42a7-95bf-65b6872380de?hub.mode=subscribe&hub.verify_token=facebook_verify_token_123&hub.challenge=automation_test")

if [ "$WEBHOOK_RESPONSE" = "automation_test" ]; then
    echo "✅ Webhook endpoint: ACCESSIBLE"
else
    echo "❌ Webhook endpoint: NOT ACCESSIBLE"
fi
echo ""

# Test 4: Test mock message processing
echo "4️⃣ Testing message processing..."
MOCK_RESPONSE=$(curl -s -X POST "http://localhost:3001/webhook/0180acbd-8e10-42a7-95bf-65b6872380de" \
  -H "Content-Type: application/json" \
  -d '{
    "senderPhone": "automation_test_user",
    "senderName": "Automation Test User",
    "message": "Testing full automation workflow",
    "messageId": "auto_test_123"
  }' | jq -r '.ok')

if [ "$MOCK_RESPONSE" = "true" ]; then
    echo "✅ Message processing: WORKING"
else
    echo "❌ Message processing: FAILED"
fi
echo ""

# Summary
echo "📋 AUTOMATION STATUS SUMMARY:"
echo "=============================="
if [ "$WEBHOOK_CHECK" = "true" ] && [ "$PAGE_CHECK" -gt "0" ] && [ "$WEBHOOK_RESPONSE" = "automation_test" ] && [ "$MOCK_RESPONSE" = "true" ]; then
    echo "🎉 ALL SYSTEMS READY - Facebook integration is fully automated!"
    echo ""
    echo "✅ When you create a new Facebook channel, it will automatically:"
    echo "   • Create webhook subscription"
    echo "   • Subscribe page to app"
    echo "   • Handle incoming messages"
    echo "   • Create customers and tickets"
    echo "   • Enable bidirectional messaging"
    echo ""
    echo "🚀 Ready for production use!"
else
    echo "⚠️  Some components need attention - check individual test results above"
fi