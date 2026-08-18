# Environment map

Inventory of environment variable **names** observed in the legacy/previous
artifacts, with the future domain that would own them. No values are copied
and none are active in this repo; the current (empty) baseline is
`.env.example`. Keys move from this map into `.env.example` only when the
owning phase in `docs/ROADMAP.md` ports that domain.

| Future domain owner           | Environment key names (values NOT copied)                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database                      | `DATABASE_URL`, `DIRECT_URL`, `PRISMA_LOG`                                                                                                                                                                                                                                                    |
| Auth                          | `AUTH_SECRET`, `NEXTAUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`, `PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOW_MOCK_AUTH`, `NEXT_PUBLIC_MOCK_AUTH`, `NEXT_PUBLIC_SHOW_DEMO_LOGIN`, `ALLOW_TEST_HELPERS`, `EVA_REQUIRE_API_AUTH`                  |
| App / marketing flags         | `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_COMMERCE_ENABLED`, `COMMERCE_BACKEND_ENABLED`, `DEPLOYMENT_ENV`, `ALLOW_PUBLIC_ORIGIN_LOCALHOST_FALLBACK`, `SHARE_LINK_TTL_DAYS`, `ADMIN_STATS_SECRET`, `SUPPORT_MEMORY_FALLBACK`, `ACCOUNT_DISPLAY_PLAN`, `ACCOUNT_EVA_TOKEN_DISPLAY_LIMIT`             |
| Payments (Stripe)             | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                                                                                                                                                                                                            |
| Fulfillment / Inngest         | `FULFILLMENT_WEBHOOK_URL`, `FULFILLMENT_WEBHOOK_SECRET`, `FULFILLMENT_NOTIFY_EMAIL`, `FULFILLMENT_NOTIFY_EMAILS`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`                                                                                                                                  |
| Email (Resend)                | `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`                                                                                                                                                                                                                                                       |
| Rate limiting (Upstash Redis) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                                                                                                                                                                                                          |
| Observability (Sentry)        | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`                                                                                                                                                                                                   |
| Storage (Cloudflare R2)       | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_USE_R2_UPLOADS`, `DISABLE_LOCAL_DISK_UPLOAD`                                                                                                                                     |
| Studio / generation (Fal.ai)  | `FAL_KEY`, `FAL_API_KEY`, `MESH_HERO_PROVIDER`, `MESH_PREVIEW_PROVIDER`, `STUDIO_ENABLED`, `NEXT_PUBLIC_STUDIO_ENABLED`, `STUDIO_USER_DAILY_COST_LIMIT_USD`, `STUDIO_SCHEMA`, `ENABLE_GENERATION_ARCHIVE`, `GENERATION_ARCHIVE_DIR`                                                           |
| Eva chat / LLM                | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE`, `OPENROUTER_PRIMARY_MODEL`, `OPENROUTER_FALLBACK_MODEL`, `OPENROUTER_RECOVERY_EXTRA_MODEL`, `CHAT_ATTACHMENT_VISION_MODEL`, `DEBUG_CHAT_TRACE`, `SEED_RAG`, `ALLOW_PROD_SEED` |

> Secrets policy: only key names are recorded here. Never read, print, copy, or
> commit secret values.
