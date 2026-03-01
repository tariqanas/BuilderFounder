# IT Sniper — SaaS V1

Stack: **Next.js 14 (App Router, TypeScript)** + **Supabase (Auth + Postgres + Storage)** + **Stripe (Checkout + Webhook + Portal)**.

## Fonctionnalités V1
- Landing premium minimal (`/`) avec CTA Start Beta.
- Login email/password Supabase (`/login`).
- Gating SSR `/app/*` par auth serveur + abonnement actif/trialing.
- Onboarding (`/app/onboarding`) : upload CV PDF + critères, extraction texte tolérante (fallback si PDF sans texte).
- Dashboard (`/app`) : radar, statut abonnement, missions de la semaine, liste paginée de missions.
- Billing (`/billing`) : démarrer abonnement Stripe + portail client selon statut.
- Ingestion Make.com sécurisée : `POST /api/missions/ingest` via `x-api-key` (validation stricte + rate-limit).
- Healthcheck interne protégé : `GET /api/health`.

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
2. Exécuter les migrations SQL dans `supabase/migrations`.
3. Vérifier que le bucket privé `cv` existe.
4. Activer email/password dans Auth Providers.

### RLS policies (résumé)
- `profiles`: l’utilisateur peut lire/insérer/mettre à jour uniquement sa ligne (`auth.uid() = user_id`).
- `subscriptions`: l’utilisateur peut lire/insérer/mettre à jour uniquement sa ligne.
- `user_settings`: l’utilisateur peut lire/insérer/mettre à jour uniquement sa ligne.
- `cv_files`: l’utilisateur peut lire/insérer/mettre à jour uniquement ses données.
- `missions`: l’utilisateur peut seulement lire ses missions (`SELECT` uniquement), pas de `INSERT/UPDATE/DELETE` côté user.

## Stripe
1. Créer un produit + price récurrent et renseigner `STRIPE_PRICE_ID`.
2. Webhook endpoint: `POST /api/stripe/webhook`.
3. Événements requis:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
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

## Release candidate checklist (manuel)
- [ ] Signup / login / logout.
- [ ] Gating paywall: `/app` inaccessible sans session, puis inaccessible sans subscription active/trialing.
- [ ] Checkout Stripe: success URL vers `/app`, cancel URL vers `/billing`.
- [ ] Sync webhook: vérifier transitions `active`, `trialing`, `canceled`, `past_due`.
- [ ] Portal Stripe accessible uniquement si `stripe_customer_id` présent.
- [ ] Onboarding CV: PDF valide (OK), mauvais format (KO), fichier >5MB (KO).
- [ ] Ingest endpoint: payload valide (OK), payload invalide (400), mauvaise API key (401).
- [ ] Dashboard isolation: un user ne voit jamais les missions d’un autre.
- [ ] Vérification RLS via SQL editor / API avec token utilisateur.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
