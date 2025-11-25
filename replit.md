# ProspectAI - Outil de Prospection Automatisé Production-Ready

Application fullstack de prospection pour agences de développement spécialisées en immobilier d'entreprise.

## 📋 Vue d'ensemble

ProspectAI est un outil complet de prospection qui:
- **Scrape intelligemment** via Firecrawl + GPT-4 (gestion auto des CAPTCHAs)
- **Enrichit les données** via Hunter.io (domaine + email automatiques)
- **Génère des emails personnalisés** avec OpenAI GPT-4
- **Envoie de vrais emails** via Resend avec tracking
- **Gère des campagnes complètes** avec throttling et statistiques

## 🎯 Fonctionnalités Principales

### ✅ Scraping IA avec Firecrawl
- **Sources supportées**: Pages Jaunes, CCI France, LinkedIn (via Google)
- **URL personnalisées**: Possibilité de scraper n'importe quel site
- **Paramètres configurables**: Mots-clés, régions, nombre de résultats (5-100)
- **Extraction IA**: GPT-4 analyse le contenu et extrait les données structurées
- **Gestion automatique**: CAPTCHAs, JavaScript, anti-bots

### ✅ Enrichissement avec Hunter.io
- **Recherche de domaine**: Trouve le domaine à partir du nom de l'entreprise
- **Recherche d'emails**: Trouve les emails professionnels à partir du domaine
- **Vérification d'emails**: Vérifie que les emails sont valides et délivrables
- **Enrichissement en masse**: Bouton pour enrichir tous les prospects sans email
- **Plan gratuit**: 50 recherches + 100 vérifications/mois

### ✅ Envoi d'Emails avec Resend
- **Intégration native Replit**: Gestion automatique des credentials
- **Templates personnalisables**: Variables {{companyName}}, {{domain}}, {{region}}, etc.
- **Personnalisation IA**: GPT-4 adapte chaque email au prospect
- **Throttling intelligent**: 1 email/seconde pour éviter le spam
- **Tracking**: Envoyés, erreurs, statuts des campagnes

### ✅ Interface Complète
- **Dashboard**: Statistiques en temps réel
- **Prospects**: Table avec filtres, recherche, export CSV, stats email
- **Templates**: Création et gestion de templates d'emails
- **Campagnes**: Lancement et suivi des campagnes
- **Scraping**: Interface complète avec options avancées
- **Dark Mode**: Thème sombre avec persistance

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 avec TypeScript
- **Routing**: Wouter
- **UI**: Shadcn UI (Radix + Tailwind CSS)
- **Data Fetching**: TanStack Query v5
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js avec Express
- **Database**: PostgreSQL (Neon) avec Drizzle ORM
- **Services**:
  - `firecrawl-scraper.ts`: Scraping IA avec Firecrawl + GPT-4
  - `hunter-enrichment.ts`: Enrichissement Hunter.io (domaine + email)
  - `email-generator.ts`: Génération d'emails personnalisés avec OpenAI
  - `resend-email-sender.ts`: Envoi d'emails via Resend
- **API**: REST avec validation Zod

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
│   │   ├── firecrawl-scraper.ts  # Scraping IA
│   │   ├── hunter-enrichment.ts  # Enrichissement Hunter.io
│   │   ├── email-generator.ts     # OpenAI integration
│   │   └── resend-email-sender.ts # Envoi emails Resend
│   ├── db.ts
│   ├── storage.ts
│   └── routes.ts
└── shared/
    └── schema.ts
```

## 🔧 Configuration

### Variables d'environnement (Secrets)
- `DATABASE_URL`: PostgreSQL connection string
- `FIRECRAWL_API_KEY`: Clé API Firecrawl (https://firecrawl.dev)
- `HUNTER_API_KEY`: Clé API Hunter.io (https://hunter.io)
- `OPENAI_API_KEY`: Clé API OpenAI

### Intégrations Replit
- **Resend**: Configuré via le connecteur Replit (gestion auto des credentials)
- **PostgreSQL**: Base de données Neon intégrée

### Base de données
Tables principales:
- `prospects`: Entreprises scrapées
- `email_templates`: Templates réutilisables
- `campaigns`: Campagnes avec métriques
- `email_sends`: Historique d'envois
- `scraping_jobs`: Jobs de scraping

## 🚀 Utilisation

### 1. Scraper des prospects
1. Aller dans l'onglet "Scraping"
2. Cliquer sur "Nouveau Scraping IA"
3. Configurer: source, région, type d'activité
4. (Optionnel) Options avancées: mots-clés, nombre max
5. Lancer le scraping

### 2. Enrichir les prospects (Hunter.io)
1. Aller dans l'onglet "Prospects"
2. Vérifier que Hunter.io est connecté (badge vert)
3. Cliquer sur "Enrichir (X)" pour trouver les emails manquants
4. L'enrichissement trouve: domaine → emails → vérifie validité

### 3. Créer un template
1. Aller dans l'onglet "Templates"
2. Cliquer sur "Nouveau Template"
3. Utiliser les variables: `{{companyName}}`, `{{domain}}`, `{{region}}`
4. Le système ajoute automatiquement `{{aiPersonalization}}`

### 4. Lancer une campagne
1. Aller dans l'onglet "Campagnes"
2. Vérifier que Resend est connecté (badge vert)
3. Créer une campagne avec un template
4. Lancer la campagne (envoi avec throttling 1/s)

## 📊 Schémas de données

### Prospect
```typescript
{
  id: string (UUID)
  companyName: string
  email?: string | null
  domain?: string | null
  phone?: string
  address?: string
  city?: string
  region?: string
  activityType?: string
  source: string
  status: "new" | "contacted" | "qualified"
  scrapedAt: Date
  lastContactedAt?: Date
}
```

### EmailTemplate
```typescript
{
  id: string (UUID)
  name: string
  subject: string
  body: string
  category?: string
  createdAt: Date
}
```

## 🎨 Design System

- **Font**: Inter
- **Primary**: Bleu professionnel HSL(217, 91%, 48%)
- **Components**: Shadcn UI
- **Test IDs**: Tous les éléments interactifs

## 🔐 Sécurité

- Clés API stockées dans Replit Secrets
- Validation Zod sur tous les endpoints
- Throttling pour éviter le spam
- Pas d'exposition de données sensibles

## 📈 Limites et Coûts

### Firecrawl
- Plan gratuit: 500 crédits
- ~$0.64 / 1000 pages

### Hunter.io
- Plan gratuit: 50 recherches + 100 vérifications/mois
- Plans payants disponibles

### Resend
- Plan gratuit: 100 emails/jour
- Plan payant: À partir de $20/mois

### OpenAI
- Utilise GPT-4o
- ~$0.01-0.03 / email personnalisé

## 🌐 Déploiement

L'application est prête pour le déploiement via Replit Deployments.

## 📅 Dernière mise à jour
25 novembre 2025 - Ajout Hunter.io pour enrichissement automatique (domaine + email)
