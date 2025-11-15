# Updated Instagram Integration Setup - All Required Fields

## Required Instagram/Facebook Credentials

For proper Instagram integration, you need these **5 essential credentials**:

### 1. **Facebook Page ID** (`facebookPageId`)
- The ID of your Facebook Page that's connected to your Instagram Business Account
- Find it: Facebook Page → About → Page ID
- Example: `123456789012345`

### 2. **Instagram Business Account ID** (`instagramAccountId`) 
- The ID of your Instagram Business Account
- Get via Graph API: `GET /{facebook-page-id}?fields=instagram_business_account`
- Example: `17841400455970028`

### 3. **Facebook Page Access Token** (`pageAccessToken`)
- Long-lived access token for your Facebook Page
- Required for sending Instagram messages
- Get from Facebook Graph API Explorer or App Dashboard
- Example: `EAABwzLixnjYBAO...` (long string)

### 4. **Facebook App Secret** (`appSecret`)
- Your Facebook App's secret key
- Used for webhook signature verification
- Find it: Facebook App → Settings → Basic → App Secret
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 5. **Facebook App ID** (`appId`)
- Your Facebook App's ID
- Find it: Facebook App → Settings → Basic → App ID  
- Example: `987654321098765`

### 6. **Webhook Verify Token** (`webhookVerifyToken`)
- Custom token you create for webhook verification
- Can be any secure string you choose
- Example: `instagram_verify_token_123`

## Updated API Request Format

### Create Instagram Channel
```json
{
  "type": "INSTAGRAM",
  "name": "Instagram Business Account",
  "config": {
    "facebookPageId": "YOUR_FACEBOOK_PAGE_ID",
    "instagramAccountId": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID", 
    "pageAccessToken": "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN",
    "appSecret": "YOUR_FACEBOOK_APP_SECRET",
    "appId": "YOUR_FACEBOOK_APP_ID",
    "webhookVerifyToken": "instagram_verify_token_123",
    "webhookUrl": "https://your-ngrok-url.ngrok-free.app/webhook"
  }
}
```

## How to Get Each Credential

### Step 1: Facebook Page Setup
1. Create/use existing Facebook Page
2. Connect it to Instagram Business Account
3. Note the Facebook Page ID from Page → About

### Step 2: Facebook App Setup  
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app → Business type
3. Note App ID and App Secret from Settings → Basic
4. Add Instagram Basic Display product
5. Add Webhooks product

### Step 3: Get Instagram Business Account ID
```bash
# Use Graph API Explorer or curl
curl "https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={PAGE_ACCESS_TOKEN}"

# Response will contain:
{
  "instagram_business_account": {
    "id": "17841400455970028"  # This is your instagramAccountId
  }
}
```

### Step 4: Generate Page Access Token
1. Go to Graph API Explorer
2. Select your app
3. Generate User Access Token with pages_manage_metadata, instagram_basic, pages_show_list permissions
4. Exchange for long-lived token:
```bash
curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_LIVED_TOKEN}"
```

### Step 5: Get Page Access Token
```bash
curl "https://graph.facebook.com/v18.0/me/accounts?access_token={LONG_LIVED_USER_TOKEN}"
# Find your page in the response and use its access_token
```

## Updated Postman Collection

The Postman collection has been updated with the new request format:

```json
{
  "type": "INSTAGRAM",
  "name": "Instagram Business Account", 
  "config": {
    "facebookPageId": "YOUR_FACEBOOK_PAGE_ID",
    "instagramAccountId": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "pageAccessToken": "YOUR_FACEBOOK_PAGE_ACCESS_TOKEN", 
    "appSecret": "YOUR_FACEBOOK_APP_SECRET",
    "appId": "YOUR_FACEBOOK_APP_ID",
    "webhookVerifyToken": "instagram_verify_token_123",
    "webhookUrl": "{{ngrokUrl}}/webhook"
  }
}
```

## Validation Added

The backend now validates all required fields:
- ✅ `facebookPageId` - Required
- ✅ `instagramAccountId` - Required  
- ✅ `pageAccessToken` - Required
- ✅ `appSecret` - Required
- ✅ `appId` - Required
- ✅ `webhookVerifyToken` - Required
- ✅ `webhookUrl` - Optional

## Testing Your Setup

1. **Import Updated Postman Collection**
2. **Fill in Real Credentials** in the "Create Instagram Channel" request
3. **Test Channel Creation** - should succeed with all fields
4. **Test Webhook** - should verify properly with your app secret
5. **Send Test Message** - should create customer and ticket

## Common Issues & Solutions

### Issue: "Instagram credentials missing"
**Solution**: Ensure all 5 required fields are provided in config

### Issue: Webhook verification fails  
**Solution**: Check `appSecret` matches your Facebook App Secret

### Issue: Messages not sending
**Solution**: Verify `pageAccessToken` has correct permissions and `instagramAccountId` is correct

### Issue: Can't find Instagram Account ID
**Solution**: Use Graph API to get it from your Facebook Page:
```bash
curl "https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={PAGE_TOKEN}"
```

The integration now properly validates and uses all required Instagram/Facebook credentials for full functionality!