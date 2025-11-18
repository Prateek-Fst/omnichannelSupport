#!/bin/bash

echo "🔍 Checking Facebook webhook subscriptions..."

# Check current subscriptions using App Access Token (APP_ID|APP_SECRET)
curl -s "https://graph.facebook.com/v18.0/1831081534952935/subscriptions?access_token=1831081534952935|9c1835a21525dcfbd881fca719e52744" | jq '.'

echo ""
echo "🔧 If no 'page' subscription found, run this command:"
echo ""
echo "curl -X POST \"https://graph.facebook.com/v18.0/1831081534952935/subscriptions\" \\"
echo "  -d \"object=page\" \\"
echo "  -d \"callback_url=https://1124e994fc0c.ngrok-free.app/webhook/0180acbd-8e10-42a7-95bf-65b6872380de\" \\"
echo "  -d \"verify_token=facebook_verify_token_123\" \\"
echo "  -d \"fields=messages,messaging_postbacks,feed\" \\"
echo "  -d \"access_token=1831081534952935|9c1835a21525dcfbd881fca719e52744\"