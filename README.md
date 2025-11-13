# DelightChat Backend - Multi-Tenant Omni-Channel Helpdesk API

A production-grade, scalable backend for an omni-channel customer support and marketing automation platform built with NestJS, PostgreSQL, Redis, and BullMQ.

## Features

- **Multi-Tenant Architecture**: Complete data isolation with org-based scoping
- **Omni-Channel Support**: WhatsApp, Instagram, Facebook, Twitter, LinkedIn integrations
- **Real-Time Messaging**: Inbound/outbound message handling with BullMQ workers
- **Campaign Management**: Batch message sending with rate limiting and retry logic
- **RBAC**: Admin and Agent roles with permission-based access control
- **Analytics**: Ticket statistics, agent performance, channel analytics
- **Audit Logging**: Complete audit trail of all admin actions
- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Invite System**: Email-based user onboarding with expiring tokens

## Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL 16 + Prisma ORM
- **Message Queue**: BullMQ + Redis
- **Authentication**: JWT + Passport
- **Logging**: Pino
- **API Docs**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Quick Start with Docker

```bash
# Clone repository
git clone <repo>
cd delight-chat-backend

# Start all services
docker-compose up -d

# Run migrations and seed
docker-compose exec api pnpm run db:push
docker-compose exec api pnpm run seed

# API available at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

### Local Development

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run migrations
pnpm run db:push

# Seed database
pnpm run seed

# Start API
pnpm run start:dev

# In separate terminals, start workers
pnpm run worker:inbound
pnpm run worker:outbound
pnpm run worker:campaigns
pnpm run worker:analytics
```

## Project Structure

```
src/
├── api/              # API modules (auth, tickets, channels, etc.)
├── connectors/       # Channel connectors (WhatsApp, Instagram, etc.)
├── workers/          # Background job workers (BullMQ)
├── common/           # Shared utilities (logger, prisma, redis)
├── config/           # Configuration services
├── app.module.ts     # Main app module
└── main.ts           # Application entry point

prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Database seeding
```

## Available Scripts

```bash
# Development
pnpm run start:dev          # Start API in watch mode
pnpm run build             # Build NestJS app
pnpm run start:prod        # Start production build

# Database
pnpm run db:generate       # Generate Prisma client
pnpm run db:push          # Push schema to database
pnpm run db:migrate       # Create and run migrations
pnpm run db:studio        # Open Prisma Studio
pnpm run seed             # Seed database with sample data

# Workers
pnpm run worker:inbound    # Process incoming messages
pnpm run worker:outbound   # Send outgoing messages
pnpm run worker:campaigns  # Handle campaign sending
pnpm run worker:analytics  # Generate analytics

# Testing
pnpm run test             # Unit tests
pnpm run test:e2e         # End-to-end tests
pnpm run test:cov         # Coverage report
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create organisation and admin user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Get new access token
- `POST /auth/accept-invite` - Accept user invite
- `GET /auth/me` - Get current user

### Organisations
- `GET /orgs/:orgId` - Get organisation details
- `PATCH /orgs/:orgId` - Update organisation

### Users & Invites
- `GET /orgs/users` - List organisation users
- `POST /orgs/users/invites` - Create user invite (admin only)
- `GET /orgs/users/invites/list` - List pending invites (admin only)
- `POST /orgs/users/:userId/deactivate` - Deactivate user (admin only)

### Channels
- `POST /orgs/:orgId/channels` - Create channel (admin only)
- `GET /orgs/:orgId/channels` - List channels
- `GET /orgs/:orgId/channels/:channelId` - Get channel
- `PUT /orgs/:orgId/channels/:channelId` - Update channel (admin only)
- `DELETE /orgs/:orgId/channels/:channelId` - Delete channel (admin only)

### Tickets
- `POST /orgs/:orgId/tickets` - Create ticket (admin only)
- `GET /orgs/:orgId/tickets` - List tickets with filters
- `GET /orgs/:orgId/tickets/:ticketId` - Get ticket with messages
- `PUT /orgs/:orgId/tickets/:ticketId` - Update ticket
- `POST /orgs/:orgId/tickets/:ticketId/assign` - Assign ticket (admin only)
- `POST /orgs/:orgId/tickets/:ticketId/close` - Close ticket

### Messages
- `GET /orgs/:orgId/tickets/:ticketId/messages` - Get ticket messages
- `POST /orgs/:orgId/tickets/:ticketId/messages` - Send message

### Campaigns
- `POST /orgs/:orgId/campaigns` - Create campaign (admin only)
- `GET /orgs/:orgId/campaigns` - List campaigns
- `POST /orgs/:orgId/campaigns/:id/recipients` - Add recipients (admin only)
- `POST /orgs/:orgId/campaigns/:id/start` - Start campaign (admin only)
- `GET /orgs/:orgId/campaigns/:id/stats` - Get campaign stats

### Macros
- `GET /orgs/macros/:orgId` - List macros
- `POST /orgs/macros/:orgId` - Create macro
- `PUT /orgs/macros/:orgId/:macroId` - Update macro
- `DELETE /orgs/macros/:orgId/:macroId` - Delete macro

### Analytics
- `GET /orgs/analytics/tickets` - Ticket analytics
- `GET /orgs/analytics/channels` - Channel statistics
- `GET /orgs/analytics/campaigns` - Campaign statistics
- `GET /orgs/analytics/agents` - Agent performance

### Audit
- `GET /orgs/:orgId/audit-logs` - List audit logs (admin only)
- `GET /orgs/:orgId/audit-logs/summary` - Action summary (admin only)

## Webhooks

### Receive Messages
```bash
POST /webhook/:channelId
```

**Example Mock Webhook:**
```bash
curl -X POST http://localhost:3000/webhook/<channel-id> \
  -H "Content-Type: application/json" \
  -d '{
    "senderPhone": "+1234567890",
    "senderName": "John Doe",
    "message": "Hello, I need help",
    "messageId": "msg-123",
    "metadata": {}
  }'
```

## Environment Variables

See `.env.example` for all available variables. Key ones:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST/PORT` - Redis configuration
- `JWT_SECRET` - Secret key for JWT signing
- `NODE_ENV` - development/production
- `LOG_LEVEL` - Logging verbosity

## Testing

```bash
# Run unit tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov
```

## Database Migrations

```bash
# Create migration
npx prisma migrate dev --name add_feature

# Apply migrations
pnpm run db:push

# Generate Prisma client
pnpm run db:generate

# View database with UI
npx prisma studio
```

## License

MIT