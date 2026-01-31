# BuilderFounder

BuilderFounder est un MVP qui connecte builders et founders autour d’idées validées pour créer des co‑founder matches.

## Fonctionnalités MVP

- Authentification (email + OAuth) et profils
- Feed d’idées + likes
- Matches et chat temps réel
- Dashboard pour piloter likes, matches, notifications
- Notifications push OneSignal + PWA basics
- Seed automatique pour démarrer avec des données réalistes

## Stack technique

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + database)
- OneSignal (push)
- PWA basics

## Prérequis

- Node.js 18+
- Un projet Supabase
- Une app OneSignal

## Installation

```bash
npm install
```

### Variables d’environnement

Crée un fichier `.env.local` et ajoute :

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key

SEED_SECRET=your_seed_secret
```

## Lancer en local

```bash
npm run dev
```

## Seed DB

Le script seed crée automatiquement 2 utilisateurs factices, 10+ idées et quelques likes.

```bash
npm run seed
```

Ou via l’API protégée :

```bash
curl -X POST "http://localhost:3000/api/seed?secret=YOUR_SEED_SECRET"
```

## Déploiement Vercel

1. Connecte le repo à Vercel.
2. Renseigne les variables d’environnement dans Vercel (Project Settings → Environment Variables) :
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_ONESIGNAL_APP_ID
   - ONESIGNAL_REST_API_KEY
   - SEED_SECRET
3. Déploie (Vercel se charge du build Next.js automatiquement).

## Limitations actuelles

- Pas de modération avancée des idées.
- Recherche/filtrage limité.
- Pas d’analytics détaillées côté admin.

## Next steps suggérés

- Ajout d’un système d’abonnement / paiement.
- Amélioration des notifications (email + push avancées).
- Search avancée + tags dynamiques.
- Role management admin pour modération.
