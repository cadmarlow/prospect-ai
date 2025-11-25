# ProspectAI

Outil de prospection automatisé pour agences de développement spécialisées en immobilier d'entreprise en France.

## Fonctionnalités

- **Scraping intelligent** : Extraction de données depuis Pages Jaunes, CCI, LinkedIn via Firecrawl + GPT-4
- **Enrichissement automatique** : Recherche de domaines et emails via Hunter.io
- **Génération d'emails IA** : Templates personnalisés générés par GPT-3.5/GPT-4
- **Envoi d'emails** : Campagnes avec throttling via Resend
- **Dashboard analytics** : Statistiques en temps réel

## Stack Technique

### Frontend
- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS + Shadcn UI
- TanStack Query v5
- Wouter (routing)
- React Hook Form + Zod

### Backend
- Node.js + Express
- PostgreSQL (Neon)
- Drizzle ORM
- TypeScript

### Services Externes
- [Firecrawl](https://firecrawl.dev) - Scraping web
- [Hunter.io](https://hunter.io) - Enrichissement emails
- [OpenAI](https://platform.openai.com) - IA (GPT-4 / GPT-3.5)
- [Resend](https://resend.com) - Envoi d'emails

## Structure du Projet

```
prospect-ai/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Composants Shadcn UI
│   │   │   ├── app-sidebar.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── hooks/
│   │   │   └── use-toast.ts
│   │   ├── lib/
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── dashboard.tsx     # Statistiques
│   │   │   ├── prospects.tsx     # Gestion prospects
│   │   │   ├── templates.tsx     # Templates emails
│   │   │   ├── campaigns.tsx     # Campagnes
│   │   │   ├── scraping.tsx      # Interface scraping
│   │   │   └── settings.tsx      # Configuration services
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── index.html
├── server/                    # Backend Express
│   ├── services/
│   │   ├── firecrawl-scraper.ts    # Scraping Firecrawl + IA
│   │   ├── hunter-enrichment.ts     # Enrichissement Hunter.io
│   │   ├── email-generator.ts       # Génération emails OpenAI
│   │   ├── resend-email-sender.ts   # Envoi emails Resend
│   │   └── github-service.ts        # Intégration GitHub
│   ├── db.ts                  # Configuration base de données
│   ├── storage.ts             # Interface de stockage
│   ├── routes.ts              # Routes API
│   ├── index.ts               # Point d'entrée serveur
│   └── vite.ts                # Configuration Vite SSR
├── shared/                    # Code partagé
│   └── schema.ts              # Schémas Drizzle + Zod
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
└── vite.config.ts
```

## Prérequis

- Node.js 20+
- PostgreSQL 15+ (ou compte [Neon](https://neon.tech))
- Clés API :
  - Firecrawl (gratuit : 500 crédits)
  - Hunter.io (gratuit : 50 recherches/mois)
  - OpenAI (payant)
  - Resend (gratuit : 100 emails/jour)

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/cadmarlow/prospect-ai.git
cd prospect-ai
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Firecrawl - Scraping web (https://firecrawl.dev)
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxxxxx

# Hunter.io - Enrichissement emails (https://hunter.io)
HUNTER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI - IA (https://platform.openai.com)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Resend - Envoi emails (https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=votreemail@votredomaine.com

# Session
SESSION_SECRET=une-cle-secrete-longue-et-aleatoire
```

### 4. Initialiser la base de données

```bash
npm run db:push
```

### 5. Lancer le projet

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5000`

## Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build pour la production |
| `npm run start` | Lance en mode production |
| `npm run db:push` | Synchronise le schéma avec la BDD |
| `npm run db:studio` | Ouvre Drizzle Studio (interface BDD) |

## API Endpoints

### Prospects

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/prospects` | Liste tous les prospects |
| GET | `/api/prospects/:id` | Détails d'un prospect |
| POST | `/api/prospects` | Crée un prospect |
| PATCH | `/api/prospects/:id` | Met à jour un prospect |
| DELETE | `/api/prospects/:id` | Supprime un prospect |

### Templates

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/templates` | Liste les templates |
| POST | `/api/templates` | Crée un template |
| POST | `/api/templates/generate` | Génère un template avec IA |
| DELETE | `/api/templates/:id` | Supprime un template |

### Campagnes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/campaigns` | Liste les campagnes |
| POST | `/api/campaigns` | Crée une campagne |
| POST | `/api/campaigns/:id/send` | Lance l'envoi |
| GET | `/api/campaigns/:id/stats` | Statistiques |

### Scraping

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/scrape` | Lance un scraping |
| GET | `/api/scraping-jobs` | Historique des jobs |

### Enrichissement

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/enrich/:id` | Enrichit un prospect |
| POST | `/api/enrich-all` | Enrichit tous les prospects sans email |
| GET | `/api/hunter/status` | Statut Hunter.io |

### Configuration

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/settings/services` | Statut de tous les services |
| GET | `/api/stats` | Statistiques globales |

## Schéma de Base de Données

### prospects
```sql
id            UUID PRIMARY KEY
company_name  VARCHAR NOT NULL
email         VARCHAR
domain        VARCHAR
phone         VARCHAR
address       VARCHAR
city          VARCHAR
region        VARCHAR
activity_type VARCHAR
source        VARCHAR NOT NULL
status        VARCHAR DEFAULT 'new' -- new, contacted, qualified
scraped_at    TIMESTAMP
last_contacted_at TIMESTAMP
```

### email_templates
```sql
id         UUID PRIMARY KEY
name       VARCHAR NOT NULL
subject    VARCHAR NOT NULL
body       TEXT NOT NULL
category   VARCHAR
created_at TIMESTAMP
```

### campaigns
```sql
id          UUID PRIMARY KEY
name        VARCHAR NOT NULL
template_id UUID REFERENCES email_templates
status      VARCHAR DEFAULT 'draft' -- draft, sending, completed
sent_count  INTEGER DEFAULT 0
error_count INTEGER DEFAULT 0
created_at  TIMESTAMP
started_at  TIMESTAMP
completed_at TIMESTAMP
```

### email_sends
```sql
id          UUID PRIMARY KEY
campaign_id UUID REFERENCES campaigns
prospect_id UUID REFERENCES prospects
status      VARCHAR -- sent, failed, opened, clicked
sent_at     TIMESTAMP
error       TEXT
```

### scraping_jobs
```sql
id           UUID PRIMARY KEY
source       VARCHAR NOT NULL
region       VARCHAR
activity_type VARCHAR
status       VARCHAR -- pending, running, completed, failed
results_count INTEGER DEFAULT 0
created_at   TIMESTAMP
completed_at TIMESTAMP
error        TEXT
```

## Services Externes

### Firecrawl
Scraping web intelligent avec gestion automatique des CAPTCHAs et JavaScript.
- **Gratuit** : 500 crédits
- **Documentation** : https://docs.firecrawl.dev

### Hunter.io
Recherche de domaines et emails professionnels.
- **Gratuit** : 50 recherches + 100 vérifications/mois
- **Documentation** : https://hunter.io/api-documentation

### OpenAI
Extraction de données structurées et génération d'emails personnalisés.
- **Modèles utilisés** : GPT-4 (scraping), GPT-3.5-turbo (templates)
- **Documentation** : https://platform.openai.com/docs

### Resend
Service d'envoi d'emails transactionnels.
- **Gratuit** : 100 emails/jour
- **Documentation** : https://resend.com/docs

## Variables de Template Email

Utilisez ces variables dans vos templates :

| Variable | Description |
|----------|-------------|
| `{{companyName}}` | Nom de l'entreprise |
| `{{domain}}` | Domaine web |
| `{{region}}` | Région |
| `{{city}}` | Ville |
| `{{activityType}}` | Type d'activité |
| `{{aiPersonalization}}` | Personnalisation générée par IA |

## Développement

### Ajouter un nouveau composant UI

```bash
npx shadcn@latest add [component-name]
```

### Modifier le schéma de base de données

1. Modifier `shared/schema.ts`
2. Exécuter `npm run db:push`

### Conventions de code

- **Composants** : PascalCase (`MyComponent.tsx`)
- **Hooks** : camelCase avec prefix `use` (`useMyHook.ts`)
- **Services** : kebab-case (`my-service.ts`)
- **Test IDs** : `{action}-{target}` ou `{type}-{content}-{id}`

## Déploiement

### Sur Replit
L'application est configurée pour Replit Deployments. Cliquez sur "Deploy" dans l'interface.

### Autres plateformes

1. Build : `npm run build`
2. Variables d'environnement à configurer
3. Commande de démarrage : `npm run start`

## Troubleshooting

### Erreur "OpenAI quota exceeded"
Le scraping utilise un fallback regex si le quota OpenAI est dépassé. Les données seront moins structurées mais le scraping fonctionnera.

### Erreur "Hunter.io rate limit"
Attendez le reset mensuel ou passez à un plan payant.

### Erreur de connexion PostgreSQL
Vérifiez que `DATABASE_URL` est correct et que SSL est activé (`?sslmode=require`).

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'Ajout de ma feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvrir une Pull Request

## Licence

MIT

## Contact

Pour toute question, ouvrez une issue sur GitHub.
