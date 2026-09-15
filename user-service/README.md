# User Service

User Service is a microservice responsible for managing user profiles and listening to asynchronous domain events emitted by other services (such as `auth-service`).

## Architecture

```
Auth Service -- (emits user.created) --> RabbitMQ Exchange ('auth_events')
                                                |
                                                v
                                  Queue ('user_service_user_created')
                                                |
                                                v
                               User Service Consumer --> PostgreSQL (user_db)
```

## Profile Schema

```json
{
  "id": "profile-id",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Shivam",
  "profileImage": null,
  "mobileNumber": null,
  "gender": null,
  "bio": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Folder Structure

```
src/
├── config/       # env validation, Prisma client, RabbitMQ client singleton
├── controllers/  # user profile HTTP handlers
├── dtos/         # user profile response mapper
├── middleware/   # auth (JWT verification), validation, centralized error handling
├── routes/       # Express routers (/users, /health)
├── services/     # user profile CRUD logic
│   └── events/   # consumer subscriber for user.created events
├── types/        # TypeScript declarations
├── utils/        # AppError and JWT token validator
├── validators/   # Zod request schemas
├── app.ts        # Express app wiring
└── server.ts     # process entrypoint (listen + consumer boot + graceful shutdown)
prisma/
└── schema.prisma
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Bearer JWT | Retrieve logged-in user's profile |
| PATCH | `/users/me` | Bearer JWT | Update logged-in user's profile |
| GET | `/users/:userId` | None | Public lookup for a user profile by `userId` |
| GET | `/health` | None | Liveness check |

## Running Locally

```bash
pnpm install
npx prisma migrate dev --name init
pnpm run dev
```

## Running with Docker Compose

```bash
docker compose up --build
```
