# ProspectAI - Outil de Prospection Automatisé

Application fullstack de prospection pour agences de développement spécialisées en immobilier d'entreprise.

## 📋 Vue d'ensemble

ProspectAI est un outil complet de prospection qui automatise la collecte de prospects depuis diverses sources (Pages Jaunes, CCI), génère des emails personnalisés avec l'IA, et permet de gérer des campagnes d'emailing en masse.

## 🎯 Fonctionnalités principales

### ✅ Implémenté (MVP)
- **Dashboard** : Statistiques en temps réel (prospects totaux, emails envoyés, taux d'ouverture, conversion)
- **Gestion des Prospects** : Base de données PostgreSQL avec filtres par région, statut, recherche textuelle
- **Scraping Web Automatisé** : Collecte automatique depuis Pages Jaunes et CCI France
- **Templates d'Emails** : Système de templates réutilisables avec variables dynamiques
- **Génération IA** : Emails personnalisés via OpenAI GPT-5
- **Campagnes d'Emailing** : Envoi en masse avec suivi
- **Export CSV** : Export complet des prospects avec échappement CSV correct
- **Dark Mode** : Thème sombre avec persistance localStorage

## 🏗️ Architecture

### Frontend
- **Framework** : React 18 avec TypeScript
- **Routing** : Wouter
- **UI Components** : Shadcn UI (Radix primitives + Tailwind CSS)
- **Data Fetching** : TanStack Query v5
- **Forms** : React Hook Form + Zod validation
- **Styling** : Tailwind CSS avec design system personnalisé (Inter font)

### Backend
- **Runtime** : Node.js avec Express
- **Database** : PostgreSQL (Neon) avec Drizzle ORM
- **Services** :
  - Web Scraper (scraping asynchrone)
  - Email Generator (OpenAI GPT-5 integration)
  - Email Sender (envoi en masse)
- **API** : REST avec validation Zod

## 📁 Structure du projet

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Shadcn components
│   │   │   ├── app-sidebar.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── pages/
│   │   │   ├── dashboard.tsx
│   │   │   ├── prospects.tsx
│   │   │   ├── templates.tsx
│   │   │   ├── campaigns.tsx
│   │   │   └── scraping.tsx
│   │   └── App.tsx
├── server/
│   ├── services/
│   │   ├── scraper.ts       # Web scraping logic
│   │   ├── email-generator.ts  # OpenAI integration
│   │   └── email-sender.ts  # Bulk email sending
│   ├── db.ts                # Database connection
│   ├── storage.ts           # Database operations
│   └── routes.ts            # API endpoints
└── shared/
    └── schema.ts            # Drizzle schemas + Zod validation
```

## 🔧 Configuration

### Variables d'environnement
- `DATABASE_URL` : PostgreSQL connection string (auto-configurée par Replit)
- `OPENAI_API_KEY` : Clé API OpenAI pour génération d'emails
- `SESSION_SECRET` : Secret pour sessions Express

### Base de données
Tables principales :
- `prospects` : Informations des prospects scrapés
- `email_templates` : Templates d'emails réutilisables
- `campaigns` : Campagnes d'emailing avec métriques
- `email_sends` : Historique d'envois individuels
- `scraping_jobs` : Jobs de scraping avec statuts

## 🚀 Développement

### Commandes
- `npm run dev` : Démarre le serveur de développement (Express + Vite)
- `npm run db:push` : Synchronise le schéma avec la base de données

### Workflow
Le workflow "Start application" lance automatiquement `npm run dev` qui :
1. Démarre Express sur le port 5000
2. Sert le frontend Vite
3. Expose les API REST sur `/api/*`

## 📊 Schémas de données

### Prospect
```typescript
{
  id: string (UUID)
  companyName: string
  email?: string
  domain?: string
  phone?: string
  address?: string
  city?: string
  region?: string
  activityType?: string
  source: string (pagesjaunes | cci)
  status: string (new | contacted | qualified)
  scrapedAt: Date
}
```

### EmailTemplate
```typescript
{
  id: string (UUID)
  name: string
  subject: string
  body: string  // Supporte {{companyName}}, {{domain}}, {{region}}, {{aiPersonalization}}
  category?: string
  createdAt: Date
}
```

## 🎨 Design System

### Couleurs
- Primary: HSL(217, 91%, 48%) - Bleu professionnel
- Sidebar: Ton gris clair/foncé selon le thème
- Cards: Légèrement élevées par rapport au background

### Typographie
- Font principale : Inter
- Font monospace : JetBrains Mono (pour emails, domaines)

### Composants
- Tous les éléments interactifs ont des `data-testid` pour les tests
- Utilisation systématique des composants Shadcn
- Sidebar navigation fixe avec indicateur de page active

## 🧪 Tests

Tests end-to-end avec Playwright vérifiant :
- Navigation entre pages
- Création de templates
- Lancement de scraping
- Affichage des prospects
- Toggle du dark mode

Status : ✅ Tous les tests passent

## 📈 Prochaines fonctionnalités

1. **Intégration LinkedIn** : Enrichissement des données prospects
2. **Validation d'emails** : Vérification automatique de validité
3. **Tracking avancé** : Ouvertures et clics dans les emails
4. **Relances automatiques** : Gestion intelligente des réponses
5. **Intégration CRM** : Synchronisation avec CRMs populaires

## 🔐 Sécurité

- Toutes les clés API sont stockées dans Replit Secrets
- Validation Zod sur tous les endpoints
- Échappement CSV pour éviter les injections
- Pas d'exposition de données sensibles dans les logs (email bodies filtrés)

## 📝 Notes techniques

- Le scraping génère actuellement des données de test (3-5 prospects par job)
- Les emails ne sont pas réellement envoyés (console logs pour le développement)
- OpenAI GPT-5 est utilisé pour la personnalisation avancée
- React Query utilise un fetcher global pour simplifier les requêtes

## 👥 Utilisateurs cibles

- Agences de développement web spécialisées en immobilier
- Consultants immobiliers d'entreprise
- Gestionnaires de patrimoine professionnel

## 🌐 Déploiement

L'application est prête pour le déploiement via Replit Deployments (publier).
