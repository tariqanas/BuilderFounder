# IT Sniper — Production Readiness

Stack: Next.js 14 + Supabase + Stripe + Make.

## Local setup
1. `npm install`
2. `cp .env.example .env.local`
3. Fill all required variables.
4. `npm run dev`

## Environment variables
Use `.env.example` as source of truth.

### Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `MAKE_INGEST_KEY`
- `MAKE_NOTIFY_KEY`
- `JOBS_API_KEY`
- `CRON_KEY`
- `HEALTH_KEY`
- `APP_URL`

### Optional
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `MAX_AI_CALLS_PER_RUN`
- `SIMULATE_USERS`

`lib/env.ts` validates env at startup and throws fast, explicit errors for missing/invalid variables.

## Deployment (Vercel)
- `vercel.json` configures Vercel Cron every 3 hours:
  - `GET /api/cron/run`
- The cron endpoint requires `x-cron-key: <CRON_KEY>`.

### Cron pipeline
`/api/cron/run` executes:
1. offers collection
2. normalization/upsert to `offers_raw`
3. matching
4. queue notifications in `notification_queue`

It returns JSON summary counts (offers, users processed, missions, notifications, AI calls).

## Stripe production readiness
- Checkout uses `APP_URL` for success and cancel URLs.
- Webhook endpoint: `/api/stripe/webhook`
  - verifies Stripe signature from raw request body
  - uses idempotent event handling (replay-safe) via `system_state`

### Stripe dashboard setup
1. Configure webhook URL:
   - `https://<your-domain>/api/stripe/webhook`
2. Enable events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. Test fully in Stripe test mode first.
4. Switch to live keys and live webhook secret only after successful test flow.

## Supabase production readiness
1. Create Supabase project.
2. Apply all SQL migrations in `supabase/migrations`.
3. Create storage bucket `cv` as **private**.
4. Keep RLS enabled on all tables (including deny-all service-only tables).
5. CV upload path is `cv/<userId>/cv.pdf`.
6. Service role key is server-side only (never expose client-side).

## Make production readiness
Endpoints requiring API key:
- `POST /api/missions/ingest` (uses `MAKE_INGEST_KEY`)
- `POST /api/notify/make/pull` (uses `MAKE_NOTIFY_KEY`)
- `POST /api/notify/make/ack` (uses `MAKE_NOTIFY_KEY`)

You can keep two keys or set both env vars to the same secret for a single-key setup.

### Recommended Make scenario
1. Scheduler every 5 minutes.
2. Call pull endpoint (`limit: 20`).
3. Router by channel (`email`, `whatsapp`, `sms`).
4. Send message via chosen provider.
5. Call ack endpoint with:
   - `status: sent`, or
   - `status: failed` + `error` message.

## Logging and visibility
Minimal server logs added for:
- cron start/end/failure + summary counts
- Stripe webhook signature/process failures
- Make pull/ack failures
- OpenAI HTTP and JSON parse failures

Sensitive content (CV text, personal payload content) is not logged.

## Health endpoint
- `GET /api/health`
- Header required: `x-health-key: <HEALTH_KEY>`
- Checks Supabase DB connectivity.

## Production Runbook
1. **Create Supabase project**
   - Run SQL migrations.
   - Create private bucket `cv`.
   - Verify RLS policies.
2. **Configure Vercel env vars**
   - Add all required variables from `.env.example`.
3. **Stripe setup**
   - Create product + recurring price, set `STRIPE_PRICE_ID`.
   - Configure webhook URL/events.
   - Validate in test mode.
4. **Deploy to staging**
   - `npm run build` locally first.
   - Deploy to Vercel preview/staging.
5. **Set Cron security**
   - Ensure `CRON_KEY` is present.
   - Verify cron calls include `x-cron-key`.
6. **Configure Make scenario**
   - Schedule every 5 minutes.
   - pull -> route -> send -> ack.
7. **Promote to production**
   - switch Stripe to live keys/secrets
   - deploy to production domain
8. **E2E smoke test checklist**
   - signup/login
   - checkout payment success
   - onboarding + CV upload
   - offers seeded or wait cron
   - notification received
   - dashboard mission visible

## Commands
- `npm run dev`
- `npm run lint`
- `npm run build`
