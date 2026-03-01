# IT Sniper — SaaS V1

Stack: **Next.js 14 (App Router, TypeScript)** + **Supabase (Auth + Postgres + Storage)** + **Stripe (Checkout + Webhook + Portal)**.

## Fonctionnalités V1
- Landing premium minimal (`/`) avec CTA Start Beta.
- Login email/password Supabase (`/login`).
- Gating SSR `/app/*` par auth serveur + abonnement actif/trialing.
- Onboarding (`/app/onboarding`) : upload CV PDF + critères + canaux de notification.
- Dashboard (`/app`) : radar, statut abonnement, missions de la semaine, liste paginée de missions.
- Billing (`/billing`) : démarrer abonnement Stripe + portail client selon statut.
- Ingestion Make.com sécurisée : `POST /api/missions/ingest` via `x-api-key`.
- Healthcheck interne protégé : `GET /api/health`.
- **Collecte serveur d'offres** : `POST/GET /api/jobs/offers/collect`.
- **Matching serveur multi-tenant** : `POST/GET /api/jobs/matching/run` (cache scoring + top 3/semaine).
- **Queue notifications** : `POST /api/notify/make/pull` et `POST /api/notify/make/ack`.

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

Nouvelles variables backend:
- `JOBS_API_KEY`: clé pour les jobs cron (`/api/jobs/*`).
- `MAKE_NOTIFY_KEY`: clé pour les endpoints Make pull/ack (`/api/notify/make/*`).

## Supabase
1. Créer un projet Supabase.
2. Exécuter les migrations SQL dans `supabase/migrations`.
3. Vérifier que le bucket privé `cv` existe.
4. Activer email/password dans Auth Providers.

### Schéma ajouté (multi-tenant matching)
- `offers_raw`: stockage normalisé de toutes les offres collectées, déduplication via hash unique.
- `user_offer_scores`: cache de scoring par `(user_id, offer_hash)` pour éviter de rescoring.
- `notification_queue`: file d'événements de notifications à déléguer à Make.
- `user_settings`: nouveaux flags `notify_email`, `notify_whatsapp`, `notify_sms` + numéros E.164.

### RLS policies (résumé)
- `profiles`, `subscriptions`, `user_settings`, `cv_files`: accès utilisateur limité à ses propres lignes.
- `missions`: utilisateur en lecture seule sur ses missions.
- `offers_raw`, `user_offer_scores`, `notification_queue`: **aucun accès user** (RLS deny-all), service role uniquement.

## Jobs serveur
### 1) Collecte d'offres
Endpoint:
```http
POST /api/jobs/offers/collect
x-api-key: <JOBS_API_KEY>
```
Sources V1:
- RemoteOK (JSON)
- WeWorkRemotely DevOps RSS
- Jobicy DevOps RSS

Normalisation vers `offers_raw` + hash SHA-256 `url|title|posted_at` + upsert (`onConflict=hash`).

### 2) Matching multi-tenant
Endpoint:
```http
POST /api/jobs/matching/run
x-api-key: <JOBS_API_KEY>
```
Pipeline:
1. Charge users `radar_active=true` avec subscription `active|trialing`.
2. Pré-filtre rapide (pays/remote + mots-clés stack dans title/description).
3. Limite scoring: `max 20 offres/user/run`, `max 200 offres/run`.
4. Utilise cache `user_offer_scores` (pas de rescoring si déjà noté).
5. Crée missions et applique `Top 3 / semaine / user` avec anti-duplicate URL.
6. Fallback: complète avec meilleurs scores `>=70` si pas assez de KEEP.
7. Alimente `notification_queue` (email obligatoire, WhatsApp/SMS selon settings).

## Prompt IA (définitions)
`lib/matching-engine.ts` expose:
- `SCORING_PROMPT` → JSON strict `{score, decision, reasons, missing}`
- `PITCH_PROMPT` → JSON strict `{subject, pitch}`

Les prompts restent côté backend (source of truth), sans logique métier dans Make.

## Make.com setup (notifications)
### Endpoint pull
```http
POST /api/notify/make/pull
x-api-key: <MAKE_NOTIFY_KEY>
Content-Type: application/json

{ "limit": 20 }
```
Retourne les items `pending` avec payloads (`channel`, `to`, `subject`, `message`, `mission_url`, `pitch`, `reasons`).

### Endpoint ack
```http
POST /api/notify/make/ack
x-api-key: <MAKE_NOTIFY_KEY>
Content-Type: application/json

{ "id": "<queue_id>", "status": "sent" }
```
ou
```json
{ "id": "<queue_id>", "status": "failed", "error": "provider timeout" }
```

### Scénario Make recommandé
1. **Scheduler** toutes les 5 minutes.
2. HTTP module `POST /api/notify/make/pull` (`limit=20`).
3. Router par `channel` (`email` / `whatsapp` / `sms`).
4. Envoi via connecteurs Make.
5. HTTP module `POST /api/notify/make/ack` pour chaque item (`sent` ou `failed`).

## Cron config
Le fichier `vercel.json` définit deux crons (30 min):
- `/api/jobs/offers/collect`
- `/api/jobs/matching/run`

Utiliser `Authorization: Bearer <JOBS_API_KEY>` ou `x-api-key`.

## Checklist tests (manuel)
- [ ] Migration SQL appliquée (`offers_raw`, `user_offer_scores`, `notification_queue`, nouveaux champs settings).
- [ ] `POST /api/jobs/offers/collect` avec bonne clé → offres upsertées.
- [ ] `POST /api/jobs/matching/run` → missions créées (max 3/semaine/user) + queue alimentée.
- [ ] Cache scoring: 2e run sans nouvelles offres → pas de rescoring.
- [ ] `POST /api/notify/make/pull` retourne des items `pending`.
- [ ] `POST /api/notify/make/ack` en `sent` met à jour `status`, incrémente `attempts`.
- [ ] `POST /api/notify/make/ack` en `failed` enregistre `last_error` + `attempts`.
- [ ] Validation settings: E.164 requis si `notify_whatsapp=true` / `notify_sms=true`.
- [ ] Isolation multi-tenant vérifiée (aucun accès user à `offers_raw`/`notification_queue`).

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
