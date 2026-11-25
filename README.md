# jobmatch

AI-powered job recommendation platform. Users build a profile, the system pulls in relevant job listings, and an AI matching service ranks them against the profile so users see the best fits first and can track their application status.

## LIVE DEMO
https://client-eosin-mu-85.vercel.app/

**Repositories**

| Repo | Role |
| --- | --- |
| [jobmatch](https://github.com/mansuur-iman/jobmatch) (this repo) | React client + Express/TypeScript API |
| [jobmatch-ai](https://github.com/mansuur-iman/jobmatch-ai) | FastAPI service: embeddings, vector search, recommendation logic |

## Features

- Account registration and login with token-based authentication
- User profile (skills, experience, job preferences)
- Job ingestion: fetches listings from an external jobs API based on the user's profile
- AI matching: jobs are chunked, embedded and indexed by the AI service, then retrieved by similarity to the profile
- Recommendation status tracking (for example saved, applied, rejected)
- Automated unit and integration tests for auth, profile and recommendation status

## Architecture

```
┌──────────────┐   HTTPS + JWT    ┌────────────────────┐   HTTP + API key   ┌────────────────────┐
│ React client │ ───────────────▶ │ Express API (TS)   │ ─────────────────▶ │ jobmatch-ai        │
│              │ ◀─────────────── │ Prisma + PostgreSQL│ ◀───────────────── │ FastAPI + Gemini   │
└──────────────┘                  └─────────┬──────────┘                    │ + vector store     │
                                            │                               └────────────────────┘
                                            ▼
                                   External jobs API
```

1. The API fetches jobs for a user's profile from the external jobs API and stores them in PostgreSQL.
2. A background step (`pushUnindexedJobs`) sends jobs that are not yet indexed to the AI service.
3. The AI service chunks each job description (500 characters with 100 overlap), embeds the chunks and stores them in its vector store.
4. For recommendations, the API asks the AI service to retrieve the best matches for a profile and returns ranked results to the client.

The client never talks to the AI service directly. Only the API does, using a server-side API key.

## Tech stack

| Layer | Technology |
| --- | --- |
| Client | React, Vite |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL with Prisma |
| AI service | Python, FastAPI, Google Gemini, vector store (see the jobmatch-ai repo) |
| Testing | Jest + Supertest |

## Project structure

```
jobmatch/
├── client/            # React app
├── src/
│   ├── services/      # job ingestion, AI indexing
│   ├── tests/         # unit + integration tests
│   └── ...            # routes, controllers, middleware
├── prisma/            # schema and migrations
└── .env.example
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+
- The [jobmatch-ai](https://github.com/mansuur-iman/jobmatch-ai) service running locally (default `http://localhost:8000`)

### 1. Clone and install

```bash
git clone git@github.com:mansuur-iman/jobmatch.git
cd jobmatch
npm install
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |
| `AI_SERVICE_URL` | Base URL of the AI service, e.g. `http://localhost:8000` |
| `AI_SERVICE_API_KEY` | Shared secret sent to the AI service. Must match the AI service's value |

Generate secrets with `openssl rand -hex 32`. Never commit `.env`.

### 3. Set up the database

```bash
npx prisma migrate dev
```

### 4. Run

```bash
# AI service (in the jobmatch-ai repo)
uvicorn main:app --reload --port 8000

# API
npm run dev

# Client
cd client && npm run dev
```

### 5. Test

```bash
npm test
```

## API overview

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | No | Create an account |
| POST | `/api/v1/auth/login` | No | Log in, returns a token |
| GET | `/api/v1/profile` | Yes | Get the current user's profile |
| PATCH | `/api/v1/profile` | Yes | Update profile |
| GET | `/api/v1/profile/recommendations` | Yes | Ranked job recommendations |

## Security

- **Authentication:** JWT on all user routes. Passwords are hashed before storage.
- **CORS:** enabled so the browser client can call the API. Access to data is enforced by JWT, not by origin.
- **Service-to-service auth:** the AI service rejects any request without a valid `X-API-Key` header. The key lives only in server environments and is never shipped to the client.
- **Secrets:** all credentials come from environment variables. `.env` is git-ignored and `.env.example` documents the required names.

## Author

Iman
