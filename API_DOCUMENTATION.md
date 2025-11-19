# DelightChat Backend API Documentation

## Database Schema Overview

### Core Models

#### Organisation
```typescript
{
  id: string (UUID)
  name: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### User
```typescript
{
  id: string (UUID)
  orgId: string
  name: string
  email: string (unique)
  passwordHash: string
  role: "ADMIN" | "AGENT"
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Channel
```typescript
{
  id: string (UUID)
  orgId: string
  type: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "TWITTER" | "LINKEDIN" | "MOCK"
  name: string
  config: JsonB (platform-specific configuration)
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Ticket
```typescript
{
  id: string (UUID)
  orgId: string
  channelId: string
  customerId: string | null
  externalThreadId: string
  subject: string
  status: "OPEN" | "PENDING" | "CLOSED"
  priority: "LOW" | "MEDIUM" | "HIGH"
  assigneeId: string | null
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Message
```typescript
{
  id: string (UUID)
  ticketId: string
  orgId: string
  channelId: string
  direction: "INBOUND" | "OUTBOUND"
  externalMessageId: string | null
  senderUserId: string | null
  senderName: string
  content: string
  metadata: JsonB
  createdAt: DateTime
}
```

#### Customer
```typescript
{
  id: string (UUID)
  orgId: string
  name: string
  avatar: string | null
  platform: ChannelType
  externalId: string
  lastMessageAt: DateTime | null
  lastMessage: string | null
  isActive: boolean
  metadata: JsonB
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## API Endpoints

### 1. Authentication APIs

#### POST /auth/signup
**Description**: Create organisation and admin user
**Payload**:
```json
{
  "orgName": "string",
  "name": "string", 
  "email": "string",
  "password": "string" (min 8 chars)
}
```
**Response**:
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string", 
    "role": "ADMIN",
    "orgId": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### POST /auth/login
**Payload**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**:
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "ADMIN" | "AGENT", 
    "orgId": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### POST /auth/refresh
**Payload**:
```json
{
  "refreshToken": "string"
}
```
**Response**:
```json
{
  "accessToken": "string"
}
```

#### POST /auth/accept-invite
**Payload**:
```json
{
  "token": "string",
  "name": "string",
  "password": "string"
}
```
**Response**:
```json
{
  "user": {
    "id": "string",
    "email": "string", 
    "name": "string",
    "role": "ADMIN" | "AGENT",
    "orgId": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### GET /auth/me
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "ADMIN" | "AGENT",
  "orgId": "string",
  "isActive": boolean
}
```

---

### 2. Organisation APIs

#### GET /orgs/{orgId}
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "id": "string",
  "name": "string",
  "createdAt": "DateTime",
  "updatedAt": "DateTime"
}
```

#### PATCH /orgs/{orgId}
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "name": "string" // optional
}
```
**Response**: Updated organisation object

---

### 3. User Management APIs

#### GET /orgs/{orgId}/users
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string", 
    "role": "ADMIN" | "AGENT",
    "isActive": boolean,
    "createdAt": "DateTime"
  }
]
```

#### GET /orgs/{orgId}/users/{userId}
**Headers**: `Authorization: Bearer {token}`
**Response**: Single user object

#### POST /orgs/{orgId}/users/invites
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Payload**:
```json
{
  "email": "string",
  "role": "ADMIN" | "AGENT"
}
```
**Response**:
```json
{
  "id": "string",
  "email": "string",
  "role": "string",
  "token": "string",
  "expiresAt": "DateTime"
}
```

#### GET /orgs/{orgId}/users/invites/list
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**:
```json
[
  {
    "id": "string",
    "email": "string",
    "role": "string",
    "accepted": boolean,
    "expiresAt": "DateTime",
    "createdAt": "DateTime"
  }
]
```

#### POST /orgs/{orgId}/users/{userId}/deactivate
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**: Success message

---

### 4. Channel Management APIs

#### POST /orgs/{orgId}/channels
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only

**For Instagram Channel**:
```json
{
  "type": "INSTAGRAM",
  "name": "string",
  "config": {
    "facebookPageId": "string",
    "instagramAccountId": "string", 
    "pageAccessToken": "string",
    "appSecret": "string",
    "appId": "string",
    "webhookVerifyToken": "string",
    "webhookUrl": "string"
  }
}
```

**For Facebook Channel**:
```json
{
  "type": "FACEBOOK",
  "name": "string", 
  "config": {
    "facebookPageId": "string",
    "pageAccessToken": "string",
    "appSecret": "string", 
    "appId": "string",
    "webhookVerifyToken": "string",
    "webhookUrl": "string"
  }
}
```

**Response**:
```json
{
  "id": "string",
  "type": "INSTAGRAM" | "FACEBOOK" | "WHATSAPP" | "TWITTER" | "LINKEDIN",
  "name": "string",
  "config": {},
  "isActive": boolean,
  "createdAt": "DateTime"
}
```

#### GET /orgs/{orgId}/channels
**Headers**: `Authorization: Bearer {token}`
**Response**: Array of channel objects

#### GET /orgs/{orgId}/channels/{channelId}
**Headers**: `Authorization: Bearer {token}`
**Response**: Single channel object

#### PUT /orgs/{orgId}/channels/{channelId}
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Payload**: Channel update data
**Response**: Updated channel object

#### DELETE /orgs/{orgId}/channels/{channelId}
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**: Success message

#### GET /orgs/{orgId}/channels/{channelId}/customers
**Headers**: `Authorization: Bearer {token}`
**Response**: Array of customers for the channel

#### POST /orgs/{orgId}/channels/{channelId}/test-connection
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**: Connection test result

---

### 5. Ticket Management APIs

#### GET /orgs/{orgId}/tickets
**Headers**: `Authorization: Bearer {token}`
**Query Parameters**:
- `status`: "OPEN" | "PENDING" | "CLOSED"
- `assigneeId`: string
- `channelId`: string
- `priority`: "LOW" | "MEDIUM" | "HIGH"

**Response**:
```json
[
  {
    "id": "string",
    "subject": "string",
    "status": "OPEN" | "PENDING" | "CLOSED",
    "priority": "LOW" | "MEDIUM" | "HIGH",
    "createdAt": "DateTime",
    "updatedAt": "DateTime",
    "channel": {
      "id": "string",
      "name": "string",
      "type": "string"
    },
    "customer": {
      "id": "string", 
      "name": "string",
      "platform": "string"
    },
    "assignee": {
      "id": "string",
      "name": "string"
    }
  }
]
```

#### GET /orgs/{orgId}/tickets/{ticketId}
**Headers**: `Authorization: Bearer {token}`
**Response**: Ticket object with messages

#### POST /orgs/{orgId}/tickets
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "channelId": "string",
  "customerId": "string",
  "subject": "string",
  "priority": "LOW" | "MEDIUM" | "HIGH"
}
```
**Response**: Created ticket object

#### PUT /orgs/{orgId}/tickets/{ticketId}
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "subject": "string", // optional
  "status": "OPEN" | "PENDING" | "CLOSED", // optional
  "priority": "LOW" | "MEDIUM" | "HIGH" // optional
}
```
**Response**: Updated ticket object

#### POST /orgs/{orgId}/tickets/{ticketId}/assign
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "assigneeId": "string"
}
```
**Response**: Updated ticket object

#### POST /orgs/{orgId}/tickets/{ticketId}/close
**Headers**: `Authorization: Bearer {token}`
**Response**: Updated ticket object

---

### 6. Message APIs

#### GET /orgs/{orgId}/tickets/{ticketId}/messages
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
[
  {
    "id": "string",
    "direction": "INBOUND" | "OUTBOUND",
    "senderName": "string",
    "content": "string",
    "metadata": {},
    "createdAt": "DateTime",
    "senderUser": {
      "id": "string",
      "name": "string"
    }
  }
]
```

#### POST /orgs/{orgId}/tickets/{ticketId}/messages
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "content": "string",
  "metadata": {} // optional
}
```
**Response**: Created message object

---

### 7. Campaign APIs

#### GET /orgs/{orgId}/campaigns
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "messageTemplate": "string",
    "status": "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED",
    "scheduledAt": "DateTime",
    "createdAt": "DateTime",
    "channel": {
      "id": "string",
      "name": "string",
      "type": "string"
    }
  }
]
```

#### GET /orgs/{orgId}/campaigns/{campaignId}
**Headers**: `Authorization: Bearer {token}`
**Response**: Single campaign object

#### POST /orgs/{orgId}/campaigns
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Payload**:
```json
{
  "channelId": "string",
  "name": "string",
  "messageTemplate": "string",
  "scheduledAt": "DateTime" // optional
}
```
**Response**: Created campaign object

#### POST /orgs/{orgId}/campaigns/{campaignId}/recipients
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Payload**:
```json
{
  "recipients": ["string"] // array of contact identifiers
}
```
**Response**: Success message

#### POST /orgs/{orgId}/campaigns/{campaignId}/start
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**: Updated campaign object

#### GET /orgs/{orgId}/campaigns/{campaignId}/recipients
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
[
  {
    "id": "string",
    "recipientContact": "string",
    "status": "PENDING" | "SENT" | "FAILED",
    "sentAt": "DateTime",
    "error": "string"
  }
]
```

#### GET /orgs/{orgId}/campaigns/{campaignId}/stats
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "totalRecipients": number,
  "sentCount": number,
  "failedCount": number,
  "pendingCount": number
}
```

---

### 8. Macro APIs

#### GET /orgs/macros/{orgId}
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "content": "string",
    "createdAt": "DateTime",
    "createdByUser": {
      "id": "string",
      "name": "string"
    }
  }
]
```

#### POST /orgs/macros/{orgId}
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "name": "string",
  "content": "string"
}
```
**Response**: Created macro object

#### PUT /orgs/macros/{orgId}/{macroId}
**Headers**: `Authorization: Bearer {token}`
**Payload**:
```json
{
  "name": "string", // optional
  "content": "string" // optional
}
```
**Response**: Updated macro object

#### DELETE /orgs/macros/{orgId}/{macroId}
**Headers**: `Authorization: Bearer {token}`
**Response**: Success message

---

### 9. Customer APIs

#### GET /orgs/{orgId}/customers
**Headers**: `Authorization: Bearer {token}`
**Query Parameters**:
- `platform`: Channel type filter
- `search`: Search by name

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "avatar": "string",
    "platform": "INSTAGRAM" | "FACEBOOK" | "WHATSAPP" | "TWITTER" | "LINKEDIN",
    "externalId": "string",
    "lastMessageAt": "DateTime",
    "lastMessage": "string",
    "isActive": boolean,
    "metadata": {}
  }
]
```

#### GET /orgs/{orgId}/customers/{customerId}
**Headers**: `Authorization: Bearer {token}`
**Response**: Single customer object

#### GET /orgs/{orgId}/customers/{customerId}/tickets
**Headers**: `Authorization: Bearer {token}`
**Response**: Array of customer's tickets

#### GET /orgs/{orgId}/customers/stats/platforms
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "INSTAGRAM": number,
  "FACEBOOK": number,
  "WHATSAPP": number,
  "TWITTER": number,
  "LINKEDIN": number
}
```

#### GET /orgs/{orgId}/customers/overview/dashboard
**Headers**: `Authorization: Bearer {token}`
**Response**: Customer overview with platform statistics

---

### 10. Analytics APIs

#### GET /orgs/analytics/tickets
**Headers**: `Authorization: Bearer {token}`
**Query Parameters**: Various filters
**Response**:
```json
{
  "totalTickets": number,
  "openTickets": number,
  "closedTickets": number,
  "avgResponseTime": number,
  "ticketsByStatus": {},
  "ticketsByChannel": {},
  "dailyStats": []
}
```

#### GET /orgs/analytics/channels
**Headers**: `Authorization: Bearer {token}`
**Response**: Channel statistics

#### GET /orgs/analytics/campaigns
**Headers**: `Authorization: Bearer {token}`
**Response**: Campaign statistics

#### GET /orgs/analytics/agents
**Headers**: `Authorization: Bearer {token}`
**Response**: Agent performance metrics

---

### 11. Audit APIs

#### GET /orgs/{orgId}/audit-logs
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Query Parameters**: Various filters
**Response**:
```json
[
  {
    "id": "string",
    "action": "string",
    "entity": "string", 
    "entityId": "string",
    "metadata": {},
    "createdAt": "DateTime",
    "user": {
      "id": "string",
      "name": "string"
    }
  }
]
```

#### GET /orgs/{orgId}/audit-logs/summary
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**: Action summary statistics

#### GET /orgs/{orgId}/audit-logs/user/{userId}
**Headers**: `Authorization: Bearer {token}`
**Role**: ADMIN only
**Response**: User-specific audit logs

---

### 12. Notification APIs

#### GET /orgs/{orgId}/notifications
**Headers**: `Authorization: Bearer {token}`
**Query Parameters**:
- `unreadOnly`: boolean

**Response**:
```json
[
  {
    "id": "string",
    "type": "NEW_MESSAGE" | "NEW_COMMENT" | "TICKET_ASSIGNED" | "CUSTOMER_REPLY",
    "title": "string",
    "message": "string",
    "data": {},
    "isRead": boolean,
    "readAt": "DateTime",
    "createdAt": "DateTime"
  }
]
```

#### PATCH /orgs/{orgId}/notifications/{notificationId}/read
**Headers**: `Authorization: Bearer {token}`
**Response**: Updated notification

#### PATCH /orgs/{orgId}/notifications/mark-all-read
**Headers**: `Authorization: Bearer {token}`
**Response**: Success message

---

### 13. Webhook APIs

#### GET /webhook/{channelId}
**Description**: Webhook verification for platforms like Facebook/Instagram
**Query Parameters**:
- `hub.mode`: "subscribe"
- `hub.verify_token`: string
- `hub.challenge`: string

**Response**: Returns challenge string if verification successful

#### POST /webhook/{channelId}
**Description**: Receive incoming messages from platforms
**Payload**: Platform-specific webhook payload
**Response**:
```json
{
  "ok": true
}
```

---

## Error Responses

All APIs return consistent error responses:

```json
{
  "statusCode": number,
  "message": "string",
  "error": "string"
}
```

Common HTTP status codes:
- `400`: Bad Request
- `401`: Unauthorized  
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Authentication

Most APIs require JWT authentication via the `Authorization: Bearer {token}` header. Tokens are obtained from login/signup endpoints and can be refreshed using the refresh token.

## Rate Limiting

APIs may implement rate limiting. Check response headers for rate limit information.

## Pagination

List endpoints may support pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)