# Moviefax!

A simple app to learn interesting facts about your favorite movie!

- TypeScript
- Next.js / React
- Tailwind CSS
- PostgreSQL + Prisma
- Google OAuth (NextAuth v5)
- OpenAI
- OMDb

All engineering documentation is kept in the `docs/` subfolder, showing
reasoning behind each step. For a linear history of work, look at
`docs/DEVELOPMENT.md`.

## Setup

1. Clone this repository and run `npm install` from the project root.
1. Copy `.env.example` to `.env`.
1. **Run `git check-ignore .env` in the project root.** If `.env` is not listed,
   add it to `.gitignore`. This file contains secrets in plaintext. If it ever
   leaks, treat every secret in it as compromised and rotate them.
1. Generate an auth secret with `npx auth secret` and copy it into `AUTH_SECRET`
   in `.env`.
1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create a
   new project, and navigate to `APIs & Services > OAuth Consent Screen >
   Clients > Create Client`. Select **Web application**. **Copy the client
   secret immediately — you cannot retrieve it later.** Set
   `AUTH_GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_CLIENT_SECRET` in `.env`.
1. On the client page, add `http://localhost:3000` to authorized JavaScript
   origins and `http://localhost:3000/api/auth/callback/google` to authorized
   redirect URIs.
1. Get an OMDb API key from
   [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) and copy it
   into `OMDB_API_KEY` in `.env`.
1. Create an OpenAI API key from the [OpenAI API keys
   page](https://platform.openai.com/api-keys) and copy it into `OPENAI_API_KEY`
   in `.env`.
1. Point `DATABASE_URL` at a running PostgreSQL instance and run `npm run
   db:push` from the project root to apply the schema.
1. Run `npm run dev`. The app will be available at `http://localhost:3000`.

## Environment Variables

All server-side variables are validated at startup by Zod in `src/env.js`,
ensuring all variables are set so that the application cannot run in a partially
initialized state

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | NextAuth session encryption key — generate with `npx auth secret` |
| `AUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/moviefax`) |
| `OMDB_API_KEY` | OMDb API key for movie title validation |
| `OPENAI_API_KEY` | OpenAI API key for fact generation |

See `.env.example` for a template.

## Database

This project uses **`prisma db push`** (schema synchronisation) rather than
versioned migration files. This is suboptimal but for the purposes of a short
solo project, this is correct.

| Command | Purpose |
|---|---|
| `npm run db:push` | Sync the schema to the database (first-time setup and schema changes) |
| `npm run db:studio` | Open Prisma Studio to inspect data |
| `npm run db:generate` | Regenerate the Prisma client after schema edits |

There is no `migrations/` directory. If you change the schema, re-run `db:push`.

## Architecture

### Request routing

The app uses the Next.js App Router. The root route `/` is a **smart
dispatcher**: it reads session state server-side and issues an immediate
redirect to `/login`, `/onboard`, or `/dashboard` — no client-side flash.

```
/           → dispatcher (no UI)
/login      → Google OAuth sign-in page
/onboard    → one-time movie selection (authenticated, pre-onboarding)
/dashboard  → main view (authenticated, onboarded)
/edit-favorite → change favourite movie (authenticated, onboarded)
/api/fact   → fact generation endpoint (GET = fetch, POST = force-refresh)
```

### Authentication

Authentication is handled with NextAuth and the Google OAuth provider. Session
data is stored in a separate postgres table and on each login, we refresh the
user's email, name, and profile picture

### Movie validation pipeline

User-submitted movie strings are **never passed to OpenAI** to eliminate the
risk of prompt injection. On submission, the server queries OMDb with the raw
user input and returns normalised candidates. The user selects one and submits
the intended movie's IMDb id; the server stores only the OMDb-provided title
and IMDb ID in the `User` row (`trustedTitle` / `trustedImdbId`). All downstream
fact generation uses the validated title, not the original user string. This
eliminates prompt injection at the data layer.

`trusted*` field names are reserved for server-side use only, this is not a
strongly typed boundary between trusted and untrusted data but it does provide a
visual hint as to what is okay to pass to OpenAI. In a real application, we'd
likely have a tiered level of trustedness embedded in the type system
- User Provided: Effectively untrusted. Never pass through to the DB, render in
  HTML, or send to LLM
- Validated: User Provided data ran through anti-XSS and anti "Bobby Tables"
  measures. Still is fundamentally user provided and so must not be passed
  through to the LLM
- Trusted: Data sourced from an oracle that will give correct answers. Must
  provide structured data. Can be passed to LLMs

### Fact generation and caching

Fact generation is protected by two layers:

**Layer 1 — in-process single-flight** (`src/server/facts/core.ts`): a per-user
key map deduplicates concurrent requests within the same Node.js process. If two
requests for the same user arrive simultaneously, only one OpenAI call is made;
both callers receive the same result.

**Layer 2 — PostgreSQL row lock** (`SELECT ... FOR UPDATE`): after passing the
single-flight gate, the user row is locked for the duration of the transaction.
This serialises requests across multiple processes or machines.

Inside the lock, the decision logic is:

- If the most recent fact for the current movie is **less than 60 seconds old**
  and was generated **after** the current request was received → return it
  without calling OpenAI.
- Otherwise → call OpenAI, persist the new fact, return it.

Force-refresh requests carry a `requestReceivedAt` timestamp. If a concurrent
request already generated a newer fact by the time the lock is acquired, the
force-refresh is satisfied by that fact — no duplicate OpenAI call.

On OpenAI failure (timeout or API error): fall back to the most recently
generated fact for this user. If no fact exists yet, return a user-facing error.

### Deduplication / variation

The 5 most recent facts for the current movie are included in the OpenAI prompt
as "already seen" context, discouraging the model from repeating itself. The
window is intentionally bounded (5 facts × 500 char max each) to keep token
costs predictable. This is the weakest part of the architecture, as passing LLM
output back into itself can cause degredation. Currently do not have the
resources to solve personally, but will think on issue.

### Data model

| Model | Key fields | Notes |
|---|---|---|
| `User` | `id`, `email`, `name`, `image`, `trustedTitle`, `trustedImdbId` | Auth identity + current favourite movie |
| `MovieFact` | `id`, `fact`, `movieTitle`, `createdAt`, `userId` | Append-only fact log; indexed on `(userId, createdAt DESC)` |
| `Account` | OAuth provider tokens | NextAuth standard |
| `Session` | Session token + expiry | NextAuth standard |
| `VerificationToken` | — | NextAuth standard |

### Trust boundary

The `trusted*` prefix on `trustedTitle` and `trustedImdbId` signals that those
values have been validated server-side against the OMDb source of truth. This
prefix is **never used** in client-facing code, API payloads, form field names,
or UI labels — only on the server, after validation. Client-facing code uses
neutral names such as `movieTitle` or `selectedMovieId`.

## Variant chosen

The **Backend variant** was implemented. The shape of the correct solution was
immediately apparent: the 60-second cache requirement maps cleanly onto a simple
row locking strategy, and each OpenAI resilience requirement has a clear,
bounded answer — exponential backoff, timestamp-based deduplication for
force-refresh races, and a last-known-good fallback. Changing of favorite movie
from the Frontend variant was also implemented, but was implemented as a
separate page for simplicity.

## Key tradeoffs

**`db push` over versioned migrations** — convenient for a solo project with no
production deploy. For a team or a production system, `prisma migrate` would
provide an audit trail and safe rollback paths.

**Always acquire the write lock** — a read-first / write-if-stale pattern would
reduce lock contention, but given the 60-second cache window, overwrites are
common and the simpler always-write path is easier to reason about correctly.

**OMDb as trusted source** — OMDb is used as a convenient stand-in for a real
movie catalogue service. Acceptable for a demo; a production system would own or
cache that data to avoid depending on a third-party rate limit, perhaps manually
validating new movies to ensure that no compromised data becomes trusted.

**In-process single-flight on top of the DB lock** — the PostgreSQL lock alone
is sufficient for correctness across machines. The in-process map is a cheap
performance optimisation that avoids unnecessary DB round-trips when many
requests arrive simultaneously on one machine.

**Passing recent facts to OpenAI** — the 5-fact history window reduces
repetition with bounded token cost. Feeding the model its own output carries a
small drift risk, but the window is small enough that runaway degradation is not
a practical concern.

**`requestReceivedAt` timestamp on force-refresh** — resolves the double-click
race condition (two simultaneous force-refresh requests) for the cost of one
timestamp. The alternative (re-generating on every force-refresh regardless)
would waste OpenAI credits on collisions.

## What I'd improve with 2 more hours

- Remove the unused `Post` model (a create-t3-app template remnant still present
  in the schema)
- Switch from `db push` to versioned Prisma migrations for a proper audit trail
- Add end-to-end tests (e.g. Playwright) covering the login → onboard →
  dashboard flow
- Add per-user rate limiting on the `/api/fact` endpoint at the HTTP layer
- Surface a richer error UI when no fallback fact is available (currently a
  plain error string)
- Implement the Frontend variant: typed API client, optimistic inline movie
  editing, 30-second client-side fact cache
- Add CI (GitHub Actions) to run lint, type-check, and tests on every push
- Add a Dockerfile and docker-compose for a fully self-contained local setup
  (app + Postgres), removing the need to provision a database manually

## AI Assistance

How AI was used in this project is documented in `AI_SUMMARY.md`.
