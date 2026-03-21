# DriftAway 🌴

> **plan less. live more.**

AI-powered collaborative travel planner — mobile-first, multi-user, multi-AI.

## What is DriftAway?

DriftAway unifies trip planning, booking management, smart itinerary generation, budget tracking, document management, and real-time coordination through WhatsApp integration into a single seamless experience.

## Tech Stack

| Layer | Tech |
|-------|------|
| **Backend** | Node.js · Fastify · TypeScript · Prisma · PostgreSQL · Redis · BullMQ |
| **Frontend** | Next.js 15 · Tailwind CSS · Zustand · Framer Motion · PWA |
| **AI** | OpenAI · Anthropic Claude · Google Gemini (configurable per trip) |
| **Integrations** | WhatsApp Business API · Google Maps · Twilio · S3 |

## Quick Start

```bash
# Clone
git clone https://github.com/tarunashwinc/driftaway.git
cd driftaway

# Install dependencies
npm install

# Copy env and configure
cp .env.example .env

# Setup database
npx prisma generate
npx prisma migrate dev

# Seed data
npm run db:seed

# Start development
npm run dev        # Backend on :3001
npm run dev:web    # Frontend on :3000
```

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for the full architecture guide.

## License

Proprietary — All rights reserved.
