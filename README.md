# AI Governance Control Tower

Enterprise-grade AI Governance platform for **DPDP (India Data Protection Act)**, **ISO 42001**, **ISO 42005**, and **Responsible AI** compliance.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | KPI cards, Recharts usage trends, risk heatmap, compliance breakdown |
| **AI Model Inventory** | Full CRUD model registry with tagging, metadata, and risk scoring |
| **Risk & Compliance Engine** | Auto-scoring formula, DPDP/ISO 42001 control checklists, heatmap |
| **Data Governance** | Data asset registry, PII tagging, lineage view, consent tracking |
| **Agent Governance** | Agent registry, prompt/tool/response logs, hallucination/policy flagging |
| **Monitoring** | LLM call metrics, latency, toxicity/bias scores, drift detection |
| **Audit & Reports** | Full audit trail, CSV export, filterable logs |
| **Settings** | RBAC role viewer, API key management, policy config, alert thresholds |

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · Recharts
- **Backend**: Next.js API Routes · Prisma ORM · PostgreSQL · Redis
- **AI/Observability**: OpenAI SDK · Langfuse integration · LLM logging middleware
- **Auth**: JWT (jose) · RBAC (Admin / Risk Officer / Auditor / Viewer)
- **Security**: Zod validation · Rate limiting · Secure headers · Input sanitisation

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. Clone & Install

```bash
git clone <repo-url>
cd ai-governance-tower
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database URL, JWT secret, OpenAI key, etc.
```

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Create the tables (local development database)
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

`npm run db:seed` creates three local demo accounts: `admin@governance.ai`, `risk@governance.ai` and `audit@governance.ai`.
They share one password, taken from the `SEED_PASSWORD` environment variable or, if that is unset, generated randomly and printed once by the seed script.
Never run the seed script against production.

---

## Project Structure

```
ai-governance-tower/
├── prisma/
│   ├── schema.prisma          # Full data model (10 tables)
│   └── seed.ts                # Demo data seeder
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login / Register pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── layout.tsx     # Sidebar + header wrapper
│   │   │   ├── page.tsx       # Dashboard with KPIs & charts
│   │   │   ├── models/        # AI Model Inventory
│   │   │   ├── risk/          # Risk & Compliance Engine
│   │   │   ├── data-governance/
│   │   │   ├── agents/        # Agent Governance
│   │   │   ├── monitoring/    # Observability
│   │   │   ├── audit/         # Audit Trail
│   │   │   └── settings/      # RBAC, API keys, Policy
│   │   └── api/               # REST API routes
│   │       ├── auth/          # login, register, me
│   │       ├── models/        # CRUD + [id]
│   │       ├── risk/          # [modelId] assessment
│   │       ├── agents/        # registry + [id]/logs
│   │       ├── compliance/    # control management
│   │       ├── data-assets/   # asset registry
│   │       ├── monitoring/    # aggregated metrics
│   │       ├── audit/         # audit log query
│   │       └── dashboard/     # KPI aggregation
│   ├── components/
│   │   ├── ui/                # Badge, Button, Card, Input, Label, Toaster
│   │   ├── shared/            # DataTable, StatCard, RiskBadge, Sidebar, Header
│   │   ├── models/            # AddModelModal, ModelDetailDrawer
│   │   └── risk/              # AssessModelModal
│   ├── lib/
│   │   ├── prisma.ts          # Singleton Prisma client
│   │   ├── redis.ts           # Redis + cache helpers
│   │   ├── auth/jwt.ts        # Sign / verify JWT
│   │   ├── auth/password.ts   # bcrypt helpers
│   │   ├── risk-scoring.ts    # Risk score formula engine
│   │   ├── audit-logger.ts    # Non-blocking audit writer
│   │   ├── llm-logger.ts      # OpenAI + Langfuse middleware
│   │   ├── with-auth.ts       # Route protection HOC
│   │   ├── api-response.ts    # Typed response helpers
│   │   └── utils.ts           # cn, formatDate, colour helpers
│   ├── hooks/
│   │   └── use-api.ts         # Authenticated fetch wrapper
│   ├── store/
│   │   ├── auth.store.ts      # Zustand auth + persist
│   │   └── ui.store.ts        # Sidebar, notifications
│   ├── types/
│   │   └── index.ts           # All shared TypeScript types
│   └── middleware.ts          # Rate limiting + JWT protection
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Sign in; sets the HttpOnly session cookie |
| POST | `/api/auth/register` | None | Register new user / accept an invite |
| POST | `/api/auth/logout` | None | Clears the session cookie |
| GET | `/api/auth/me` | Session | Current user and organization |

### AI Models
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/models` | Any | List models (paginated, searchable) |
| POST | `/api/models` | Risk Officer+ | Register new model |
| GET | `/api/models/:id` | Any | Get model with full details |
| PATCH | `/api/models/:id` | Risk Officer+ | Update model |
| DELETE | `/api/models/:id` | Admin | Delete model |

### Risk & Compliance
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/risk/:modelId` | Any | Get assessments for model |
| POST | `/api/risk/:modelId` | Risk Officer+ | Run new risk assessment |
| GET | `/api/compliance` | Any | List compliance controls |
| POST | `/api/compliance` | Risk Officer+ | Upsert compliance control |

### Agents & Monitoring
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/agents` | Any | List agents |
| POST | `/api/agents` | Risk Officer+ | Register agent |
| GET | `/api/agents/:id/logs` | Any | Get agent prompt logs |
| GET | `/api/monitoring` | Any | Aggregated metrics |
| GET | `/api/audit` | Auditor+ | Audit trail |
| GET | `/api/dashboard` | Any | KPI aggregates |

---

## Risk Scoring Formula

The AI Risk Score (0–100) is a weighted composite of 5 dimensions:

```
Risk Score =
  (Data Sensitivity × 0.25) +
  (Model Complexity  × 0.20) +
  (Explainability⁻¹ × 0.20) +
  (Human Oversight⁻¹× 0.20) +
  (Regulatory Exposure × 0.15)
```

| Score Range | Risk Level |
|---|---|
| 0 – 34 | LOW |
| 35 – 54 | MEDIUM |
| 55 – 74 | HIGH |
| 75 – 100 | CRITICAL |

---

## Compliance Frameworks

### DPDP (India Digital Personal Data Protection Act 2023)
Tracks controls for: Data Principal Notice, Consent, Data Accuracy, Minimisation, Storage Limitation, Cross-border Transfers, Grievance Redressal.

### ISO 42001 (AI Management System)
Tracks controls for: AI Policy, Leadership Commitment, Risk Management, System Lifecycle, Performance Evaluation, Continual Improvement.

### ISO 42005 (AI Impact Assessment)
Framework for AI impact assessments — mapped to model risk assessments.

---

## Security

- **Sessions** live in an HttpOnly, Secure, SameSite=Lax cookie that page scripts can't read. Cookie-authenticated state-changing requests from other sites are refused. Non-browser clients can send `Authorization: Bearer <token>`.
- **Revocation:** every request re-reads the caller's membership, role and plan; removing or deactivating a member, deactivating the organization, or changing the password ends existing sessions immediately.
- **Tenant isolation:** every record is checked against the caller's organization (other organizations' ids return 404). `src/__tests__/security/route-guards.test.ts` fails CI if a route skips `withAuth` or never scopes by organization.
- **RBAC** enforced at route level (`withAuth`).
- **Rate limits** on sign-in (per address, and per account after 10 failures), sign-up, password reset and other public auth endpoints, shared across instances through Redis when `REDIS_URL` is set.
- **Files** (evidence, project artifacts) are stored in a private Vercel Blob store and served only through permission-checked download routes.
- **Outbound webhooks** must be public https URLs; private and internal addresses are refused.
- Zod input validation on POST/PATCH endpoints; audit log on mutating operations.
- Security headers on every response (CSP, HSTS, X-Frame-Options, nosniff).
- Passwords hashed with bcrypt.
- The server refuses to start in production without a 32+ character `JWT_SECRET`.

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...                        # required, 32+ random characters
PRIVATE_BLOB_READ_WRITE_TOKEN=...     # private Vercel Blob store for uploaded files
REDIS_URL=redis://...                 # shared rate limits and cache (recommended)
RESEND_API_KEY=re_...                 # verification and password-reset email
```

---

## Production Deployment

1. Set `JWT_SECRET` (32+ random characters) and `PRIVATE_BLOB_READ_WRITE_TOKEN` in every environment.
2. `npm run build` no longer touches the database. Schema changes ship as migration files, reviewed in the pull request, and are applied as a separate release step **before** deploying: `npm run db:deploy` (`prisma migrate deploy`).
3. One-time setup of the migration history (the old build used `prisma db push`, so the committed migrations were incomplete):
   - `npm run db:baseline` generates `prisma/migrations/0_baseline` from `schema.prisma` and archives the old migrations. Commit the result.
   - Against the existing production database, once: `DATABASE_URL="<production url>" npx prisma migrate resolve --applied 0_baseline` (records the baseline as applied; it doesn't run it).
   - CI then checks on every pull request that the migrations produce exactly `schema.prisma`.
4. Use a separate database for preview deployments, so a pull request can never change production data.
5. Configure Redis (`REDIS_URL`) so rate limits hold across serverless instances.
6. Enable SSL for PostgreSQL and Redis connections.

---

## License

MIT — Enterprise use permitted.
