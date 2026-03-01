# IT Sniper — SaaS V1

Stack: **Next.js 14 (App Router, TypeScript)** + **Supabase (Auth + Postgres + Storage)** + **Stripe (Checkout + Webhook + Portal)**.

## Fonctionnalités V1
- Landing premium minimal (`/`) avec CTA Start Beta.
- Login email/password Supabase (`/login`).
- Gating `/app/*` par auth + abonnement actif/trialing.
- Onboarding (`/app/onboarding`) : upload CV PDF + critères, extraction de texte (pdf-parse).
- Dashboard (`/app`) : statut radar, statut abonnement, 20 dernières missions, copy pitch, lien offre.
- Billing (`/billing`) : démarrer abonnement Stripe + portail client.
- Ingestion Make.com sécurisée : `POST /api/missions/ingest` via `x-api-key`.

## Setup local
1. Installer dépendances:
   ```bash
   npm install
   ```
2. Copier variables d'environnement:
   ```bash
   cp .env.example .env.local
   ```
3. Renseigner toutes les variables.
4. Démarrer:
   ```bash
   npm run dev
   ```

## Variables d'environnement
Voir `.env.example`.

## Supabase
1. Créer un projet Supabase.
2. Exécuter la migration SQL dans `supabase/migrations/202603010001_init.sql`.
3. Vérifier que le bucket privé `cv` existe.
4. Activer email/password dans Auth Providers.

## Stripe
1. Créer un produit + price récurrent et renseigner `STRIPE_PRICE_ID`.
2. Webhook endpoint: `POST /api/stripe/webhook`.
3. Événements requis:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Renseigner `STRIPE_WEBHOOK_SECRET`.

### Test webhook en local
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Make.com ingestion
Endpoint:
```http
POST /api/missions/ingest
x-api-key: <MAKE_INGEST_KEY>
Content-Type: application/json
```

Payload attendu:
```json
{
  "userEmail": "john@example.com",
  "mission": {
    "source": "example",
    "title": "Senior Backend Engineer",
    "company": "Acme",
    "country": "France",
    "remote": "remote",
    "dayRate": 700,
    "url": "https://example.com/job/1",
    "score": 92,
    "reasons": "Stack alignée...",
    "pitch": "Bonjour, voici pourquoi..."
  }
}
```

Réponse:
```json
{ "ok": true }
```

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
