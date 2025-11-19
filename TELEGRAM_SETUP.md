# Telegram Channel Setup Guide

## 🤖 Creating a Telegram Bot

1. **Start a chat with @BotFather** on Telegram
2. **Send `/newbot`** command
3. **Choose a name** for your bot (e.g., "DelightChat Support")
4. **Choose a username** for your bot (must end with 'bot', e.g., "delightchat_support_bot")
5. **Copy the bot token** provided by BotFather (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 🔧 Setting Up the Channel

1. **Go to Channels** in your DelightChat admin panel
2. **Click "Add Channel"**
3. **Select "Telegram"**
4. **Fill in the details:**
   - **Channel Name**: Give your channel a descriptive name
   - **Bot Token**: Paste the token from BotFather
   - **Bot Username**: Your bot's username (optional)
   - **Webhook Secret**: Optional security token (recommended)

5. **Click "Create Channel"**
6. **Click "Setup Webhook Subscription"** to configure the webhook automatically

## 📱 Testing Your Integration

1. **Find your bot** on Telegram by searching for its username
2. **Start a conversation** by clicking "Start" or sending `/start`
3. **Send a test message** to your bot
4. **Check DelightChat** - you should see:
   - A new customer created
   - A new ticket created
   - The message appears in the ticket

## 💬 How It Works

- **Incoming Messages**: When someone messages your bot, DelightChat automatically:
  - Creates a customer record (if new)
  - Creates a ticket for the conversation
  - Stores the message in the ticket

- **Outgoing Messages**: When agents reply in DelightChat:
  - Messages are sent directly to the customer via Telegram
  - Conversation history is maintained in the ticket

## 🔒 Security Features

- **Webhook Secret**: Optional token to verify webhook authenticity
- **Bot Token**: Keep this secure - it's like a password for your bot
- **Automatic Customer Identification**: Uses Telegram user ID for unique identification

## 📋 Supported Message Types

- ✅ Text messages
- ✅ Photos (with captions)
- ✅ Documents (with captions)
- ✅ Voice messages
- ✅ Videos (with captions)
- ✅ Stickers
- ⚠️ Other types show as "[Unsupported message type]"

## 🛠️ Troubleshooting

### Bot not receiving messages?
1. Check if the webhook is properly set up
2. Verify your bot token is correct
3. Make sure your backend URL is accessible from the internet (use ngrok for local development)

### Messages not appearing in DelightChat?
1. Check the backend logs for webhook errors
2. Verify the webhook URL is correct
3. Test the connection using the "Test Connection" button

### Can't send messages from DelightChat?
1. Verify the bot token is valid
2. Check if the customer has blocked the bot
3. Ensure the bot has permission to send messages

## 🌐 Production Deployment

For production use:
1. **Use HTTPS** for your webhook URL
2. **Set a webhook secret** for security
3. **Monitor webhook delivery** in Telegram Bot API logs
4. **Keep bot token secure** - use environment variables

## 📞 Getting Help

If you encounter issues:
1. Check the DelightChat logs for error messages
2. Test your bot token with Telegram's API directly
3. Verify your webhook URL is accessible
4. Contact support with specific error messages