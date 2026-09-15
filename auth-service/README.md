# Auth Service

Auth Service is the first microservice in a local microservices-architecture POC. It owns user
identity: registration, login, and JWT issuance/validation.

## Architecture

```
Client
   |
   v
Auth Service
   |
   +----> PostgreSQL
   |
   +----> JWT
   |
   +----> RabbitMQ (auth_events)
```

Target end-state architecture (other services consume events):

```
                    Client
                      |
                      v
                API Gateway
                      |
              +-------+-------+
              |               |
              v               v
         Auth Service     Other Services
              |
              v
          Auth Database

                    RabbitMQ (events)
              <---------------->
               Microservices
```

## Folder Structure

```
src/
├── config/       # env validation, Prisma client, RabbitMQ client singleton
├── controllers/  # thin HTTP layer, calls services
├── middleware/   # auth (JWT), validation, centralized error handling
├── routes/       # Express routers
├── services/     # business logic + Prisma calls; events/publisher.ts for RabbitMQ events
├── types/        # shared TS types (JWT payload, Express.Request augmentation)
├── utils/        # password hashing, JWT signing/verification, AppError
├── validators/   # Zod request schemas
├── app.ts        # Express app wiring (no listen)
└── server.ts     # process entrypoint (listen + graceful shutdown)
prisma/
└── schema.prisma
```

Request flow: `Route → Controller → Service → Prisma → PostgreSQL`.

## Environment Variables

See [.env.example](.env.example):

| Variable | Description |
|---|---|
| `PORT` | Port the service listens on |
| `DATABASE_URL` | Postgres connection string (use the Compose service name, not `localhost`, when running in Docker) |
| `JWT_SECRET` | Secret used to sign/verify access tokens |
| `JWT_EXPIRES_IN` | Access token lifetime, e.g. `15m` |
| `BCRYPT_ROUNDS` | bcrypt cost factor |
| `RABBITMQ_URL` | AMQP URL for RabbitMQ broker (`amqp://guest:guest@rabbitmq:5672` in Docker) |
| `RABBITMQ_EXCHANGE` | RabbitMQ topic exchange name (`auth_events`) |

Copy `.env.example` to `.env` before running locally. Never commit `.env`.

## Running Locally (without Docker)

Requires local PostgreSQL and RabbitMQ instances.

```bash
pnpm install
npx prisma migrate dev --name init
pnpm run dev
```

Build for production:

```bash
pnpm run build
pnpm start
```

## Running with Docker Compose

```bash
docker compose up --build
```

This starts `postgres`, `rabbitmq` (with management UI at http://localhost:15672), `adminer` (http://localhost:8080), and `auth-service`, exposed at `http://localhost:3001`.

## Prisma Migrations

Migrations are a manual step, run against whichever database `DATABASE_URL` points to:

```bash
npx prisma migrate dev --name init      # create/apply a migration (dev)
npx prisma migrate deploy               # apply existing migrations (prod-like)
npx prisma generate                     # regenerate the Prisma client
```

When using Docker Compose, run migrations from the host against the exposed Postgres port
(`localhost:5432`), or `docker compose exec auth-service npx prisma migrate deploy`.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | none | Create a user |
| POST | `/auth/login` | none | Authenticate and receive a JWT |
| GET | `/auth/me` | Bearer JWT | Return the authenticated user's profile |
| GET | `/health` | none | Liveness check |

### Register

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password@123","name":"John Doe"}'
```

### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password@123"}'
```

### Profile

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <accessToken from login>"
```

## Authentication Flow

1. `/auth/register` validates input with Zod, normalizes the email, checks for a duplicate, hashes
   the password with bcrypt, and stores the user. The password hash is never returned.
2. `/auth/login` looks up the user by normalized email and compares the password hash with bcrypt.
   On success it signs a short-lived JWT (`sub`, `email`, `role`, `iat`, `exp`) using `JWT_SECRET`.
3. `/auth/me` is protected by `requireAuth` middleware, which parses the `Bearer` token, verifies
   the signature and expiration, and attaches `req.user` before the controller runs.
4. All errors flow through a centralized error handler that maps them to appropriate status codes
   without leaking stack traces, secrets, or internal details.

## Future Integration

- **RabbitMQ**: `src/services/events/publisher.ts` defines the `user.created` event shape and a
  no-op publish function. Once a broker is introduced, `auth.service.ts` will not need to change —
  only the publisher implementation.
- **API Gateway / other services**: this service is designed to sit behind a gateway and be one of
  several services validating the same JWTs.

## Assumptions & Limitations (POC)

- No refresh tokens; only short-lived access tokens.
- No rate limiting or brute-force protection on `/auth/login`.
- Single static JWT secret (no key rotation).
- RabbitMQ is not implemented; only an extension point exists.
- Role-based authorization beyond storing `role` is not enforced anywhere yet.
