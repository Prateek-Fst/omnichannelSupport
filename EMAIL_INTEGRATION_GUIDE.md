# Email Integration Guide

## Overview
The email integration allows your omnichannel support system to handle email communications alongside other channels like Telegram, Instagram, and Facebook.

## Features
- ✅ **Receive Emails**: Process incoming emails as support tickets
- ✅ **Send Replies**: Reply to emails directly from the dashboard
- ✅ **Email Threading**: Maintain conversation threads using email subjects
- ✅ **SMTP/IMAP Support**: Works with Gmail, Outlook, and other email providers
- ✅ **Automatic Webhook Setup**: No manual configuration required
- ✅ **Email Testing**: Built-in email simulation for testing

## Setup Instructions

### 1. Create Email Channel

**Frontend (Dashboard):**
1. Go to Channels page
2. Click "Add Channel"
3. Select "Email"
4. Fill in the configuration:
   - **Email Address**: Your support email (e.g., support@company.com)
   - **Password**: Email password or app password
   - **SMTP Host**: smtp.gmail.com (for Gmail)
   - **SMTP Port**: 587 (for Gmail)
   - **IMAP Host**: imap.gmail.com (optional)
   - **IMAP Port**: 993 (optional)

**Backend API:**
```bash
POST /orgs/{orgId}/channels
{
  "type": "EMAIL",
  "name": "Support Email",
  "config": {
    "email": "support@company.com",
    "password": "your-app-password",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "imapHost": "imap.gmail.com",
    "imapPort": 993
  }
}
```

### 2. Gmail Setup (Recommended)

For Gmail, you need to use App Passwords instead of your regular password:

1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account Settings > Security > App Passwords
3. Generate a new app password for "Mail"
4. Use this app password in the channel configuration

### 3. Test Email Integration

**Using the Frontend:**
1. Go to Channels page
2. Click "Test Email" button
3. Enter your email channel ID
4. Fill in test email details
5. Click "Simulate Email"
6. Check Tickets page for the new email ticket

**Using API:**
```bash
POST /email-test/{channelId}/simulate
{
  "from": "customer@example.com",
  "fromName": "John Customer",
  "subject": "Need help with my order",
  "text": "Hi, I need assistance with my recent order. Can someone help me?",
  "date": "2024-01-15T10:30:00Z"
}
```

## How It Works

### Incoming Emails
1. **Email Reception**: Currently uses webhook simulation (can be extended with IMAP polling)
2. **Parsing**: Email content is parsed into a standardized message format
3. **Ticket Creation**: Creates a new ticket or adds to existing thread
4. **Customer Linking**: Links email sender to customer record

### Outgoing Emails
1. **Agent Reply**: Agent types reply in the dashboard
2. **SMTP Sending**: Email is sent via configured SMTP server
3. **Threading**: Maintains email thread using subject line
4. **Delivery Tracking**: Tracks message delivery status

### Email Threading
- Uses email subject as thread identifier
- Replies maintain the conversation thread
- Subject format: "Re: Original Subject"

## Configuration Examples

### Gmail Configuration
```json
{
  "email": "support@company.com",
  "password": "abcd-efgh-ijkl-mnop",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "imapHost": "imap.gmail.com",
  "imapPort": 993
}
```

### Outlook Configuration
```json
{
  "email": "support@company.com",
  "password": "your-password",
  "smtpHost": "smtp-mail.outlook.com",
  "smtpPort": 587,
  "imapHost": "outlook.office365.com",
  "imapPort": 993
}
```

### Custom SMTP Configuration
```json
{
  "email": "support@yourcompany.com",
  "password": "your-password",
  "smtpHost": "mail.yourcompany.com",
  "smtpPort": 587,
  "imapHost": "mail.yourcompany.com",
  "imapPort": 993
}
```

## API Endpoints

### Channel Management
- `POST /orgs/{orgId}/channels` - Create email channel
- `GET /orgs/{orgId}/channels` - List all channels
- `POST /orgs/{orgId}/channels/{channelId}/test-connection` - Test email connection

### Email Testing
- `POST /email-test/{channelId}/simulate` - Simulate incoming email

### Messages
- `GET /orgs/{orgId}/tickets/{ticketId}/messages` - Get email thread
- `POST /orgs/{orgId}/tickets/{ticketId}/messages` - Send email reply

## Frontend Components

### Channel Creation Form
- Email configuration fields
- SMTP/IMAP settings
- Connection testing
- Auto-setup functionality

### Email Testing Page
- Simulate incoming emails
- Test channel functionality
- Debug email processing

### Ticket Interface
- View email threads
- Reply to emails
- Email-specific metadata display

## Technical Implementation

### Backend Components
1. **EmailConnector** (`src/connectors/email.connector.ts`)
   - Handles email sending via nodemailer
   - Parses incoming email webhooks
   - Manages SMTP/IMAP configuration

2. **Email Test Controller** (`src/api/webhooks/email-test.controller.ts`)
   - Provides email simulation endpoints
   - Converts email format to webhook format

3. **Channel Service Updates**
   - Email channel creation
   - Connection testing
   - Auto-configuration

### Frontend Components
1. **Channel Creation** (`app/dashboard/channels/create/page.tsx`)
   - Email configuration form
   - SMTP/IMAP field validation

2. **Email Testing** (`app/dashboard/channels/email-test/page.tsx`)
   - Email simulation interface
   - Testing workflow

3. **Channel Management** (`app/dashboard/channels/page.tsx`)
   - Email channel display
   - Test connection functionality

## Troubleshooting

### Common Issues

**Authentication Failed**
- Check email and password
- For Gmail, ensure you're using App Password
- Verify 2FA is enabled for Gmail

**Connection Timeout**
- Check SMTP host and port
- Verify firewall settings
- Test with different ports (587, 465, 25)

**Email Not Received**
- Check email simulation endpoint
- Verify channel ID is correct
- Check backend logs for errors

### Debug Steps
1. Test email connection via API
2. Check backend logs for SMTP errors
3. Verify email configuration
4. Test with email simulation
5. Check ticket creation in database

## Future Enhancements

### Planned Features
- **IMAP Polling**: Automatic email fetching
- **Email Webhooks**: Integration with email service providers
- **Attachment Support**: Handle email attachments
- **HTML Email**: Rich text email support
- **Email Templates**: Predefined response templates
- **Auto-responders**: Automatic email responses

### Integration Options
- **SendGrid**: Webhook-based email processing
- **Mailgun**: API-based email handling
- **AWS SES**: Scalable email service
- **Microsoft Graph**: Outlook integration

## Security Considerations

- Use App Passwords instead of regular passwords
- Enable 2FA on email accounts
- Store credentials securely
- Use TLS/SSL for SMTP connections
- Validate email headers and content
- Implement rate limiting for email sending

## Performance Tips

- Use connection pooling for SMTP
- Implement email queuing for high volume
- Cache email configurations
- Monitor email delivery rates
- Set up proper error handling and retries