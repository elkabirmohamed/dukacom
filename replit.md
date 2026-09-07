# DukaCom

Annuaire mobile-first en français pour les produits et services professionnels aux Comores. Les vendeurs créent un profil, publient leurs produits, et les visiteurs les contactent directement via WhatsApp.

## Run & Operate

- `pnpm --filter @workspace/dukacom run dev` — démarrer le frontend (port 23414)
- `pnpm --filter @workspace/api-server run dev` — démarrer le serveur API (port 8080)
- `pnpm run typecheck` — vérification TypeScript complète

## Stack

- React + Vite (TypeScript, Tailwind CSS, shadcn/ui)
- Firebase : Auth (email/password), Firestore (base de données), Storage (images/fichiers)
- Compression d'images automatique : browser-image-compression (max 500KB, 1280px, WebP)
- Routage : wouter
- pnpm workspaces, Node.js 24, TypeScript 5.9

## Variables d'environnement (VITE_ → frontend)

Toutes les clés Firebase sont dans les Secrets Replit sous préfixe `VITE_FIREBASE_*`. Ne jamais les écrire dans le code.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_MVOLA_NUMBER` — numéro MVola par défaut (modifiable depuis l'admin)

## Structure des pages

| Route | Rôle |
|---|---|
| `/` | Accueil — catalogue produits public |
| `/connexion` | Connexion |
| `/inscription` | Inscription avec sélection de rôle |
| `/espace-membre` | Espace visiteur + bouton "Devenir Entreprise" |
| `/configuration-entreprise` | Formulaire création profil entreprise |
| `/tableau-de-bord` | Tableau de bord vendeur (produits, profil, jours restants) |
| `/admin` | Panneau admin caché (isAdmin == true requis) |

## Collections Firestore

- `users` — uid, email, nom, role, isAdmin
- `entreprises` — profil, statut abonnement, dates
- `produits` — liés à une entreprise
- `transactions` — paiements MVola soumis pour validation
- `config/global` — numéro MVola modifiable, paramètres abonnement

## Logique métier

- **Inscription entreprise** : 60 jours gratuits, statut "actif" immédiat
- **Expiration** : statut "suspendu" → produits masqués du catalogue public
- **Réactivation** : upload reçu MVola (5 000 KMF) → admin valide → +30 jours
- **Admin** : valide/refuse les transactions, modifie le numéro MVola, voit les emails

## Fichiers clés

- `artifacts/dukacom/src/lib/firebase.ts` — initialisation Firebase
- `artifacts/dukacom/src/lib/firestore-helpers.ts` — tous les helpers Firestore + types
- `artifacts/dukacom/src/lib/storage-helpers.ts` — upload images/fichiers
- `artifacts/dukacom/src/lib/compression.ts` — compression automatique avant upload
- `artifacts/dukacom/src/contexts/AuthContext.tsx` — contexte Auth global

## Gotchas

- Les règles de sécurité Firestore doivent être configurées dans la console Firebase pour restreindre l'accès admin et propriétaire côté serveur.
- Les notifications email (Cloud Functions) nécessitent un déploiement Firebase CLI séparé.
- Le numéro MVola dans l'app est chargé depuis Firestore `config/global.mvola_number` ; si absent, utilise `VITE_MVOLA_NUMBER`.

## User preferences

- Interface 100% en français
- Mobile-first (Comores)
- Palette : bleu foncé #1B3A6B + vert WhatsApp #25D366
