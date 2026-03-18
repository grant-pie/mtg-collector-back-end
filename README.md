# MTG Collector — Backend

A REST API backend for a Magic: The Gathering card collection and management platform, built with [NestJS](https://nestjs.com) and PostgreSQL.

## Overview

This backend supports a single-admin MTG collector app where:

- An **admin** manages users, seeds the card database (via Scryfall API), creates booster packs, and runs tournaments.
- **Users** authenticate via Google OAuth, manage their card collections, build decks, trade cards with other users, and participate in tournaments.
- **Real-time notifications** are delivered over WebSocket (Socket.io).

---

## Features

### Authentication
- Google OAuth 2.0 login
- JWT access tokens with optional "remember me" (7-day sessions)
- Refresh token rotation for extended sessions

### Users
- Role-based access control: `USER` and `ADMIN`
- Public username lookup; admin can manage all users

### Cards
- MTG card data fetched and cached from the [Scryfall API](https://scryfall.com/docs/api)
- Search cards by name, set, type, colors, rarity

### User Card Collection
- Track which cards a user owns and in what quantity
- Mark cards as willing to trade

### Decks
- Users create and manage their own decks from their collection
- Add/remove individual cards; admin can manage any user's decks

### Trades
- Peer-to-peer card trading with offer/accept/reject/cancel workflow
- Trade status: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELED`

### Tournaments
- Admin creates and manages tournaments
- Track participant wins, losses, and win rate
- View standings per tournament or across all tournaments

### Notifications
- Real-time WebSocket notifications for trade events and system messages
- REST endpoints to fetch and mark notifications as read

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 (TypeScript) |
| Database | PostgreSQL + TypeORM |
| Auth | Passport.js — Google OAuth + JWT |
| Real-time | Socket.io (WebSockets) |
| External API | Scryfall (card data) |
| Validation | class-validator / class-transformer |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials

### Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=mtg_collector

JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1d

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/redirect

SESSION_SECRET=your_session_secret
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Install & Run

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### Database Migrations

```bash
# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## API Reference

| Module | Base Path | Description |
|---|---|---|
| Auth | `/auth` | Login, logout, token refresh |
| Users | `/users` | User profiles and admin management |
| Cards | `/cards` | Card search and lookup |
| User Cards | `/user-cards` | Personal card collection |
| Decks | `/decks` | Deck creation and management |
| Trades | `/trades` | Peer-to-peer card trading |
| Tournaments | `/tournaments` | Tournament management and standings |
| Notifications | `/notifications` | In-app notifications (REST + WebSocket) |

### Auth Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/redirect` | OAuth redirect handler |
| GET | `/auth/profile` | Get current user |
| POST | `/auth/remember-me` | Enable extended session |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/logout` | Logout and revoke token |

### Deck Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/decks` | User | Create a deck |
| GET | `/decks/:id` | User | Get deck by ID |
| GET | `/decks/user/:userId` | User | Get all decks for a user |
| PUT | `/decks/:id` | User | Update deck details |
| DELETE | `/decks/:id` | User | Delete a deck |
| POST | `/decks/:deckId/user-cards/:userCardId` | User | Add card to deck |
| DELETE | `/decks/:deckId/user-cards/:userCardId` | User | Remove card from deck |

### Trade Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/trades` | Create a trade offer |
| GET | `/trades` | Get all trades for current user |
| GET | `/trades/pending` | Get pending trades |
| GET | `/trades/:id` | Get trade details |
| PATCH | `/trades/:id/respond` | Accept or reject a trade |
| PATCH | `/trades/:id/cancel` | Cancel a trade |

### Tournament Endpoints (Admin)

| Method | Path | Description |
|---|---|---|
| POST | `/tournaments` | Create tournament |
| GET | `/tournaments` | List all tournaments |
| GET | `/tournaments/:id` | Get tournament details |
| GET | `/tournaments/standings` | Get overall standings |
| GET | `/tournaments/:id/standings` | Get standings for a tournament |
| PATCH | `/tournaments/:id` | Update tournament |
| PATCH | `/tournaments/:id/results/user` | Update a participant's result |
| PATCH | `/tournaments/:id/results/bulk` | Bulk update results |
| DELETE | `/tournaments/:id` | Delete tournament |

---

## Roles

| Role | Capabilities |
|---|---|
| `ADMIN` | Manage users, create boosters/card pools, manage all decks, run tournaments |
| `USER` | Manage own collection, build decks, trade cards, participate in tournaments |

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```
