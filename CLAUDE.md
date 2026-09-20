# Microservices & System Design Learning POC

## 1. Purpose of This Project

This repository is a **learning-focused microservices and system design POC**.

The primary goal is:

> **Prepare for product-based company system-design and backend/microservices interviews by learning concepts through implementation rather than only theory.**

The project should progressively evolve as new distributed-system concepts are learned.

This is **not intended to be a production-ready commercial application**. Production-grade patterns should be introduced when they are useful for understanding the underlying system-design concept.

### Learning approach

For every new concept, follow this sequence:

1. Understand the concept
2. Understand why it exists
3. Understand the architecture
4. Implement a simplified version locally
5. Test failure/success scenarios
6. Understand the production considerations
7. Know how to explain it in a system-design interview

Avoid adding unnecessary complexity before the underlying concept is understood.

---

# 2. Current Technology Stack

* Node.js
* TypeScript
* Express.js
* PostgreSQL
* Prisma
* Redis
* RabbitMQ
* Docker
* Docker Compose
* Nginx
* JWT
* Zod

Development environment:

* macOS / Apple Silicon
* Docker
* Node.js 24.x

---

# 3. Current Architecture

The current system contains:

```text
                         Client
                           |
                           v
                    API Gateway :3000
                     /           \
                    /             \
                   v               v
            Auth Service      User Service
               :3000             :3000
                  |                  |
                  v                  v
              Auth DB            User DB
                  |
                  |
                  v
              RabbitMQ
                  |
                  v
             user.created
                  |
                  v
             User Service


Redis
  |
  +---- Shared state
  |
  +---- Cache
  |
  +---- Rate limiting
```

For local development, services run as Docker containers.

---

# 4. Microservices

## Auth Service

Responsibilities:

* User registration
* Login
* Password hashing
* JWT generation
* Authentication identity
* Authentication-related data

Auth Service owns its own database.

Example user data:

```text
id
name
email
passwordHash
createdAt
```

The Auth Service should **not become a giant user/profile service**.

---

## User Service

Responsibilities:

* User profile
* Display name
* Profile image
* Mobile number
* Gender
* Bio
* Addresses
* Other profile-related information

Example:

```text
UserProfile
----------------
id
userId
displayName
profileImage
mobileNumber
gender
bio
createdAt
updatedAt
```

`userId` references the identity created by Auth Service.

There should be **no cross-service PostgreSQL foreign key**.

Each service owns its data.

---

# 5. Database-per-Service Principle

For this POC, we use one PostgreSQL container for simplicity:

```text
PostgreSQL
├── auth_db
└── user_db
```

This is intentionally different from:

```text
One DB
└── auth tables + user tables
```

The important architectural principle is:

> Each microservice owns its own data.

In production, services may eventually use completely separate PostgreSQL instances/clusters.

The POC does not need that additional infrastructure complexity yet.

---

# 6. Docker Architecture

There is one shared Docker Compose setup for the entire local POC.

Conceptually:

```text
docker-compose.dev.yml

├── api-gateway
├── auth-service
├── user-service
├── postgres
├── rabbitmq
└── redis
```

Each service has its own Dockerfile.

The Compose file orchestrates the complete local system.

---

# 7. Docker Networking

A critical concept learned:

### Host ports vs container ports

Example:

```yaml
auth-service:
  ports:
    - "3001:3000"

user-service:
  ports:
    - "3002:3000"

api-gateway:
  ports:
    - "3000:3000"
```

From the Mac:

```text
localhost:3001 → Auth Service
localhost:3002 → User Service
localhost:3000 → API Gateway
```

But containers communicate using Docker service names:

```text
http://auth-service:3000
http://user-service:3000
```

They should NOT use:

```text
localhost:3001
localhost:3002
```

for container-to-container communication.

Important rule:

> `localhost` inside a container refers to that same container.

---

# 8. Production vs Development Dockerfiles

Production uses a multi-stage Dockerfile.

Concept:

```text
Builder Stage
    |
    | TypeScript compilation
    | Prisma generation
    |
    v
Production Stage
    |
    | runtime dependencies
    | dist/
    v
Production Container
```

Example production flow:

```text
src/
 ↓
tsc
 ↓
dist/
 ↓
node dist/server.js
```

Multi-stage builds are used to keep the final production image smaller and free from unnecessary development dependencies/source files.

Development containers are optimized for fast iteration.

Typical development setup:

```yaml
volumes:
  - .:/app
  - /app/node_modules
```

And:

```text
tsx watch src/app.ts
```

Therefore:

* Source changes → automatically picked up
* Dependency changes → rebuild image
* Dockerfile changes → rebuild image

---

# 9. Load Balancing

We learned horizontal scaling using:

```text
Client
  |
  v
Nginx
 / | \
v  v  v
API API API
```

Multiple instances of the same service can run simultaneously.

Example:

```text
api-1
api-2
api-3
```

Nginx distributes requests between them.

### Vertical scaling

Increase resources of one machine:

```text
2 CPU → 8 CPU
4 GB → 16 GB
```

### Horizontal scaling

Add more instances:

```text
API-1
API-2
API-3
API-4
```

The project focuses heavily on understanding why horizontal scaling is important for distributed systems.

---

# 10. Stateless Services

We intentionally demonstrated why local in-memory state is problematic.

Example:

```typescript
const instanceData = {};
```

If:

```text
API-1 memory ≠ API-2 memory
```

then a request that writes data to API-1 may be followed by a request to API-2 that cannot see it.

Therefore:

> Horizontally scalable services should generally avoid relying on local in-memory state.

Shared state should be stored in an external system such as:

* Redis
* Database
* Object storage
* Message broker

Interview principle:

> Stateless services allow any instance to handle any request, making horizontal scaling and failover easier.

---

# 11. Redis

Redis is currently used for several concepts.

## Shared State

Instead of:

```text
API-1 memory
API-2 memory
API-3 memory
```

we can use:

```text
API-1 ─┐
API-2 ─┼──→ Redis
API-3 ─┘
```

All instances see the same shared state.

---

# 12. Redis Caching

We implemented the **cache-aside pattern**.

Architecture:

```text
Client
  |
  v
API
  |
  v
Redis
  |
  ├── HIT → return data
  |
  └── MISS
        |
        v
      Database
        |
        v
      Redis
```

Example:

```typescript
const cachedProduct = await redis.get(cacheKey);

if (cachedProduct) {
  return JSON.parse(cachedProduct);
}

const product = await database.getProduct();

await redis.set(
  cacheKey,
  JSON.stringify(product),
  { EX: 60 }
);
```

Important concepts:

* Cache hit
* Cache miss
* TTL
* Database remains the source of truth
* Redis is a fast temporary copy

Do not automatically put all application data into Redis.

---

# 13. API Gateway

We introduced an API Gateway using Express and `http-proxy-middleware`.

Architecture:

```text
Client
  |
  v
API Gateway :3000
  |
  ├── /auth/*  → Auth Service
  |
  └── /users/* → User Service
```

The gateway currently handles:

* Routing
* JWT authentication
* Route-level authentication
* Authorization/RBAC
* Rate limiting

Eventually it can also handle:

* Request tracing
* Logging
* Service discovery
* Request transformation
* Centralized security policies

---

# 14. JWT Authentication

Auth Service creates the JWT.

Example payload:

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "role": "USER"
}
```

The API Gateway verifies the JWT.

Then it forwards trusted identity information internally:

```http
X-User-Id: user-123
X-User-Role: USER
```

Important security rule:

The client must not be trusted to provide these headers.

The gateway should overwrite/remove incoming values before setting its own trusted values.

Concept:

```text
Client
  |
  | Authorization: Bearer JWT
  v
API Gateway
  |
  | verify JWT
  |
  | X-User-Id
  | X-User-Role
  v
User Service
```

---

# 15. Authentication vs Authorization

### Authentication

> Who are you?

Example:

```text
JWT is valid → authenticated
```

### Authorization

> What are you allowed to do?

Example:

```text
role = ADMIN
```

can access admin endpoints.

Current policy:

```text
GET /users/:id
    → Public

GET /users/me
    → Authentication required
    → USER or ADMIN

GET /users
    → Authentication required
    → ADMIN only
```

Expected status codes:

```text
401 → Not authenticated / invalid authentication

403 → Authenticated but not authorized
```

---

# 16. Route-Level Authentication

Not every route should require authentication.

Example:

```text
Public
GET /users/:id

Authenticated
GET /users/me
PATCH /users/me

Admin
GET /users
```

Therefore, authentication is applied according to the route's access requirements rather than globally to every endpoint.

---

# 17. Rate Limiting

Implemented Redis-based IP rate limiting.

Current conceptual implementation:

```text
10 requests / minute / IP
```

Using:

```text
INCR
EXPIRE
```

Redis key:

```text
rate-limit:<ip>
```

If the request count exceeds the limit:

```text
HTTP 429
```

Response:

```json
{
  "message": "Too many requests. Please try again later."
}
```

Important production concepts:

Public endpoints can use:

```text
IP-based limiting
```

Authenticated endpoints can additionally use:

```text
User-based limiting
```

Example:

```text
rate-limit:ip:<ip>
rate-limit:user:<userId>
```

Eventually, rate limits can be different per endpoint:

```text
/login        → 5/min
/users/me     → 100/min
/search       → 30/min
/public API   → 60/min
```

---

# 18. RabbitMQ

RabbitMQ is used for asynchronous communication.

Current architecture:

```text
Auth Service
     |
     | user.created
     v
 RabbitMQ
     |
     v
User Service
```

When Auth Service successfully creates a user, it publishes:

```text
user.created
```

User Service consumes the event and creates the corresponding profile.

This avoids requiring Auth Service to synchronously call User Service.

---

# 19. Event-Driven Architecture

The `user.created` example demonstrates asynchronous communication.

Instead of:

```text
Auth Service
     |
     | HTTP request
     v
User Service
```

we use:

```text
Auth Service
     |
     | publish event
     v
RabbitMQ
     |
     | consume event
     v
User Service
```

Advantages:

* Loose runtime coupling
* Asynchronous processing
* Better service independence
* Consumers can process independently
* Easier to add additional consumers later

Example future consumers:

```text
Auth Service
     |
     v
RabbitMQ
     |
     ├── User Service
     ├── Notification Service
     ├── Analytics Service
     └── Audit Service
```

---

# 20. RabbitMQ Infrastructure vs Business Contracts

A private npm package exists:

```text
@solutionspool/rabbitmq
```

Its purpose should be **RabbitMQ infrastructure**, not business-domain contracts.

It can contain:

```text
connection
publish
consume
exchange helpers
queue helpers
ACK/NACK
retry
DLQ infrastructure
```

It should NOT contain:

```text
UserCreated
OrderCreated
PaymentCompleted
```

business event definitions.

---
# Going Forward — Next Concepts

# 21. Data Contracts 

A separate package may be used:

```text
@solutionspool/data-contracts
```

However, the current preference is to keep it focused on **actual cross-service contracts**, especially events.

For example:

```text
@solutionspool/data-contracts

events/
├── user-created.json
├── user-updated.json
└── order-created.json
```

A JSON Schema can define:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "user.created",
  "type": "object",
  "properties": {
    "eventId": {
      "type": "string"
    },
    "userId": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "eventId",
    "userId",
    "email",
    "createdAt"
  ],
  "additionalProperties": false
}
```

JSON Schema is useful because it is language-independent.

For example:

```text
Node.js Auth Service
        ↓
     RabbitMQ
        ↓
Python User Service
```

Both can understand the same JSON Schema.

---

# 22. What Should Be Shared as a Contract?

The important rule:

> **Share contracts at system boundaries, not internal implementation models.**

Good candidate:

```text
Auth Service
    ↓
user.created
    ↓
User Service
```

Bad candidate:

```text
User Service internal:

Controller DTO
    ↓
Service DTO
    ↓
Repository model
```

Those internal types should remain inside User Service.

Similarly, do not put every HTTP DTO from every service into a giant shared package simply because they are DTOs.

A shared API contract may make sense when independently deployed components genuinely need to agree on the same API shape.

But for this POC, **events are the primary use case for the data-contracts package**.

---

# 23. Event Contract vs TypeScript Type

A generated TypeScript type can provide compile-time safety:

```typescript
interface UserCreated {
  eventId: string;
  userId: string;
  email: string;
  createdAt: string;
}
```

But TypeScript does NOT validate an actual RabbitMQ message at runtime.

Therefore, for runtime validation, use JSON Schema with a validator such as Ajv.

Concept:

```text
JSON Schema
     |
     ├── TypeScript types
     |
     └── Runtime validation
```

This becomes especially useful when consumers are written in different languages.

---

# 24. User Data Architecture

A user does not need to exist as one giant table.

Example:

```text
User ID: 123

Auth DB
├── email
├── passwordHash
└── authentication data

User DB
├── profileImage
├── mobileNumber
├── gender
├── bio
└── addresses

Social DB
├── followers
├── following
└── social statistics
```

The important principle:

> Each service owns the data related to its business responsibility.

For example, followers/following should eventually belong to a Social Service rather than being mixed into the core User Service.

---

# 25. Synchronous Service-to-Service Communication

Microservices **can communicate directly using HTTP/gRPC**.

It is incorrect to assume:

> "Microservices should never call each other directly."

Instead:

> Use synchronous communication when an immediate response is required; use asynchronous events when loose coupling and eventual consistency are acceptable.

Example:

```text
Order Service
      |
      | GET current shipping address
      v
User Service
```

This creates a runtime dependency.

If User Service is unavailable, Order Service may not be able to complete that operation.

This is sometimes acceptable because the Order Service needs the authoritative/current data immediately.

---

# 26. Reducing Synchronous Dependencies

An alternative is maintaining a local copy using events:

```text
User Service
     |
     | user.address.updated
     v
 RabbitMQ
     |
     v
Order Service
     |
     v
Order DB
```

Now Order Service can read the data locally.

Advantages:

* Fewer synchronous dependencies
* Better availability
* Faster reads

Trade-off:

> The local copy may be temporarily stale.

This is **eventual consistency**.

A service can also combine both approaches:

```text
Order Service
     |
     ├── Local DB → normal operations
     |
     └── User Service → authoritative data when absolutely required
```

---

# 27. Circuit Breaker

A circuit breaker protects a service from repeatedly calling an unhealthy downstream service.

Without a circuit breaker:

```text
Order Service
     |
     v
User Service ❌
     ↑
     |
repeated requests
```

This can lead to resource exhaustion and cascading failures.

With a circuit breaker:

```text
Order Service
     |
     v
Circuit Breaker
     |
     v
User Service
```

States:

```text
CLOSED
   |
   | repeated failures
   v
OPEN
   |
   | wait
   v
HALF-OPEN
   |
   ├── success → CLOSED
   └── failure → OPEN
```

When OPEN:

```text
Request
   ↓
Circuit Breaker
   ↓
Fail fast
```

Instead of continuously waiting for a failing downstream service.

Production systems commonly combine circuit breakers with:

* Timeouts
* Limited retries
* Exponential backoff
* Fallbacks where appropriate
* Monitoring
* Distributed tracing
* Rate limiting
* Bulkheads

---

# 28. RabbitMQ Reliability

The RabbitMQ flow currently needs to be extended with reliability patterns.

Next concepts to implement:

1. Manual ACK/NACK
2. Durable queues
3. Durable messages
4. Retry
5. Dead Letter Queue (DLQ)
6. Idempotency

Basic manual ACK concept:

```typescript
channel.consume(queue, async (message) => {
  if (!message) return;

  try {
    const data = JSON.parse(message.content.toString());

    await processMessage(data);

    channel.ack(message);
  } catch (error) {
    channel.nack(message);
  }
});
```

Important problem:

If processing succeeds but the service crashes before ACK:

```text
Message processed
      ↓
Service crashes
      ↓
ACK never sent
      ↓
RabbitMQ redelivers message
```

Therefore, consumers must be **idempotent**.

The `UserProfile.userId` unique constraint is useful here.

---

# 29. Dead Letter Queue

Infinite retries are dangerous.

Example:

```text
Message
   ↓
Processing fails
   ↓
Retry
   ↓
Retry
   ↓
Retry
   ↓
Maximum attempts
   ↓
DLQ
```

The DLQ allows permanently failed messages to be inspected/reprocessed without blocking the normal queue.

---

# 30. Important Distributed-System Principles Learned

The project should reinforce these principles:

### Service ownership

Each service owns its data.

### Statelessness

Avoid local state when horizontally scaling.

### Loose coupling

Prefer asynchronous communication where immediate responses are unnecessary.

### Eventual consistency

Accept temporary data differences when appropriate.

### Synchronous dependency management

Use timeouts, retries and circuit breakers when synchronous calls are necessary.

### Contract-first thinking

Define explicit contracts between independently deployed components.

### Failure handling

Assume:

* Network failures
* Service crashes
* Database failures
* Message duplication
* Timeouts
* Partial failures

will happen.

### Scalability

Design services so additional instances can be added.

---

# 31. Current Learning Progress

Completed / understood:

* Docker basics
* Docker Compose
* Docker networking
* Production vs development containers
* Multi-stage Docker builds
* Horizontal scaling
* Vertical scaling
* Nginx load balancing
* Stateless vs stateful services
* Redis shared state
* Redis caching
* Cache-aside pattern
* PostgreSQL database-per-service mindset
* Auth Service
* JWT authentication
* API Gateway
* Route-level authentication
* Authorization / RBAC
* HTTP 401 vs 403
* Redis-based rate limiting
* RabbitMQ basics
* Event-driven communication
* Business event contracts
* JSON Schema concept
* Service-to-service synchronous communication
* Eventual consistency
* Circuit breaker concept

Currently next:

```text
RabbitMQ Reliability
    ↓
ACK / NACK
    ↓
Durable Messages
    ↓
Retry
    ↓
DLQ
    ↓
Idempotency
```

Then continue into:

```text
Observability
Distributed tracing
Logging
Metrics
Database scaling
Replication
Sharding
CAP theorem
Consistency models
Distributed transactions
Saga pattern
Outbox pattern
Search
Message ordering
Kubernetes
Service discovery
Production deployment
```

Eventually implement system-design interview projects such as:

* URL Shortener
* Rate Limiter
* Instagram-like system
* WhatsApp-like messaging system
* YouTube-like video system
* Uber-like ride system
* Food delivery system
* E-commerce system

---

# 32. How Claude Should Help

When modifying this project:

### Do

* Explain the system-design reason behind changes.
* Prefer incremental implementation.
* Keep the architecture understandable.
* Use realistic production concepts but avoid unnecessary infrastructure.
* Explain trade-offs.
* Point out failure scenarios.
* Provide interview-oriented explanations.
* Keep service boundaries clear.
* Prefer industry-standard patterns where appropriate.
* Tell the learner why a pattern exists before implementing it.

### Don't

* Turn the POC into a huge production platform unnecessarily.
* Add Kubernetes before the underlying concept is understood.
* Add multiple databases/servers when one local container is sufficient for learning.
* Put all business models into a shared package.
* Couple services directly to each other's databases.
* Assume microservices must never communicate synchronously.
* Introduce abstractions without explaining their purpose.

---

# 33. Core Interview Mental Model

The learner should eventually be able to look at a system-design problem and reason about:

```text
Requirements
     ↓
API Design
     ↓
Service Boundaries
     ↓
Data Ownership
     ↓
Communication
     ├── Sync HTTP/gRPC
     └── Async Events
     ↓
Caching
     ↓
Scaling
     ↓
Database Design
     ↓
Consistency
     ↓
Failure Handling
     ↓
Observability
     ↓
Security
     ↓
Deployment
```

The goal is **not to memorize architectures**.

The goal is to understand:

> **Why a particular architecture is appropriate, what trade-offs it introduces, and how the system behaves when components fail or scale.**

Every new feature added to this POC should strengthen that understanding.
