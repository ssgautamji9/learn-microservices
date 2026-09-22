# Post Service

Owns user posts (`post_db`) and publishes `post.created` to the `post_events` exchange.

```
POST /            (auth via gateway X-User-Id)  create a post  -> 201, publishes post.created
GET  /me          (auth)                        list my posts
GET  /:postId     (public)                      get one post
GET  /health
```

Through the gateway these are `/posts`, `/posts/me`, `/posts/:postId`.

## Events

| Direction | Exchange | Routing key | Contract |
|---|---|---|---|
| publishes | `post_events` | `post.created` | `@solutionspool/data-contracts` `post.created.v1` |

The event carries only `eventId`, `postId`, `authorId`, `createdAt`. Consumers (User Service updates `postsCount`) do not need the post content.

## Local setup

```bash
pnpm install
pnpm prisma:migrate   # creates post_db if missing and applies migrations (DATABASE_URL must point at localhost:5432)
npx prisma generate
```
