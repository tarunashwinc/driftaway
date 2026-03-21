# DriftAway — AI-Powered Collaborative Travel Planner

## Project overview

DriftAway is a mobile-first, AI-powered collaborative travel planning platform. It unifies trip planning, booking management, smart itinerary generation, budget tracking, document management, and real-time coordination through WhatsApp integration.

**Product name**: DriftAway  
**Tagline**: plan less. live more.  
**Target audience**: GenZ travelers, families, groups  
**White-label**: Brand/logo/colors are fully configurable — NEVER hardcode brand elements.

## Tech stack

### Backend (this repo root — `src/`)
- **Runtime**: Node.js 20+ with TypeScript (strict mode)
- **Framework**: Fastify 5 with @fastify/swagger for auto-docs
- **Database**: PostgreSQL 16 via Prisma ORM (schema in `prisma/schema.prisma`)
- **Cache**: Redis 7 (ioredis) — session store, rate limiting, pub/sub
- **Queue**: BullMQ for async jobs (AI generation, notifications, WhatsApp)
- **Real-time**: Socket.io for live collaboration
- **Auth**: JWT (RS256) with access+refresh tokens, OTP via Twilio, hCaptcha
- **File storage**: S3-compatible (MinIO for dev, AWS S3 for prod)
- **Search**: Meilisearch (lightweight alternative to Elasticsearch for MVP)

### Frontend (in `web/`)
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4 + custom design tokens
- **State**: Zustand + TanStack Query v5
- **Animations**: Framer Motion
- **Maps**: @vis.gl/react-google-maps
- **PWA**: next-pwa for offline support
- **Forms**: React Hook Form + Zod validation

### AI providers (configurable per trip)
- OpenAI (gpt-4o)
- Anthropic Claude (claude-sonnet-4-20250514)
- Google Gemini (gemini-2.0-flash)

## Architecture

```
src/
├── config/          # env, constants, AI provider configs
├── middleware/       # auth, rate-limit, captcha, error-handler, rbac
├── modules/         # feature modules (each has: routes, controller, service, schema)
│   ├── auth/        # OTP send/verify, JWT issue/refresh, captcha
│   ├── user/        # profile CRUD, preferences, minor management
│   ├── trip/        # trip CRUD, traveler invites, status management
│   ├── itinerary/   # day/item CRUD, reordering, AI generation trigger
│   ├── booking/     # flight/hotel/train management, status tracking
│   ├── checklist/   # AI-generated + manual items, per-category, toggle
│   ├── document/    # upload to S3, offline cache metadata, expiry tracking
│   ├── budget/      # expense logging, currency conversion, split calc
│   ├── notification/# push (FCM), email (Resend), scheduling
│   ├── whatsapp/    # WhatsApp Business API, group management, messaging
│   ├── ai/          # provider abstraction, prompt templates, plan parser
│   ├── maps/        # Google Places, geocoding, directions, pins
│   └── admin/       # brand config, seed data, user management, analytics
├── utils/           # helpers (currency, date, slug, etc.)
├── types/           # shared TypeScript types/interfaces
├── db/
│   ├── migrations/  # Prisma migrations
│   └── seeds/       # seed data scripts
├── jobs/            # BullMQ job processors (ai-generate, notify, whatsapp-send)
└── websocket/       # Socket.io event handlers for live collab
```

## Module pattern

Every module follows this structure:
```
modules/trip/
├── trip.routes.ts      # Fastify route definitions with schema validation
├── trip.controller.ts  # Request handling, calls service, returns response
├── trip.service.ts     # Business logic, DB queries via Prisma, cache
├── trip.schema.ts      # Zod schemas for request/response validation
└── trip.types.ts       # Module-specific TypeScript types
```

## Key conventions

### Code style
- **TypeScript strict mode** everywhere — no `any` types
- **Zod** for all request/response validation
- **Prisma** for all DB access — no raw SQL unless absolutely necessary
- **Functional style** preferred — pure functions, minimal classes
- **Error handling**: Custom AppError class with HTTP status codes; Fastify error handler catches all
- **Logging**: Pino (built into Fastify) with structured JSON logs
- **Environment**: dotenv-safe with `.env.example` as schema

### Naming
- Files: `kebab-case.ts`
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database tables: `snake_case` (Prisma handles mapping)
- API routes: `/api/v1/kebab-case`

### API design
- RESTful with JSON
- All endpoints prefixed `/api/v1/`
- Auth required by default; public endpoints explicitly marked
- Pagination: `?page=1&limit=20` with cursor-based option
- Sorting: `?sort=created_at&order=desc`
- Filtering: `?status=planning&destination=bali`
- Response envelope: `{ success: boolean, data: T, meta?: { page, total } }`

### Auth flow
1. `POST /api/v1/auth/otp/send` — sends OTP to phone (rate-limited, captcha)
2. `POST /api/v1/auth/otp/verify` — returns { accessToken, refreshToken, user }
3. Access token: 15 min expiry, sent in Authorization header
4. Refresh token: 30 day expiry, HTTP-only cookie
5. RBAC: roles are `superadmin | organizer | traveler | viewer`
6. Trip-scoped permissions: organizer of trip X ≠ organizer of trip Y

### Database
- UUIDs for all primary keys
- `created_at` / `updated_at` on every table
- Soft delete via `deleted_at` where appropriate
- JSONB for flexible fields (preferences, banner_config, etc.)
- Indexes on all foreign keys and commonly filtered columns

### Testing
- Unit tests: Vitest
- Integration: Supertest + test database
- E2E: Playwright (web)
- Test files colocated: `trip.service.test.ts` next to `trip.service.ts`

## Common commands

```bash
# Development
npm run dev              # Start backend with hot reload (tsx watch)
npm run dev:web          # Start Next.js frontend
npm run dev:all          # Concurrently start both

# Database
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Visual DB browser
npm run db:seed          # Run seed data

# Testing
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:int         # Integration tests

# Code quality
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run format           # Prettier

# Build
npm run build            # TypeScript compile
npm run build:web        # Next.js production build
```

## Environment variables

All required env vars are documented in `.env.example`. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — token signing
- `TWILIO_*` — OTP SMS
- `HCAPTCHA_SECRET` — captcha verification
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_AI_KEY` — AI providers
- `WHATSAPP_*` — WhatsApp Business API
- `S3_*` — file storage
- `GOOGLE_MAPS_API_KEY` — maps and places

## Git workflow
- `main` — production-ready
- `develop` — integration branch
- Feature branches: `feature/module-name`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PR required for `main` and `develop`

## Priority for MVP (Phase 1)
1. Auth (OTP + JWT + CAPTCHA)
2. User profiles with preferences
3. Trip CRUD with traveler management
4. AI itinerary generation (Claude first)
5. Itinerary display and editing
6. Checklist engine
7. Booking management
8. Basic budget tracking
9. Next.js web frontend (mobile-first PWA)
10. Seed data

## Important notes
- This is mobile-first — every UI decision optimizes for phone screens
- Performance target: API P95 < 200ms, app interactive < 2s
- The brand is NOT hardcoded — everything comes from brand_config table/API
- AI provider is selectable per trip — abstract the interface
- WhatsApp is a first-class channel, not an afterthought
- Minors are managed by guardians — they don't have their own login
- Each traveler can have a different starting city for the same trip
