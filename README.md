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

# Run migrations
npm run db:migrate

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
| POST | `/api/auth/login` | None | Login with email + password |
| POST | `/api/auth/register` | None | Register new user |
| GET | `/api/auth/me` | Bearer | Get current user |

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

- All API routes protected with JWT Bearer tokens
- RBAC enforced at route level (`withAuth` HOC)
- Rate limiting: 100 req/min per IP (configurable)
- Zod input validation on all POST/PATCH endpoints
- Audit log on every mutating operation
- Secure HTTP headers (CSP, HSTS, X-Frame-Options)
- Passwords hashed with bcrypt (12 rounds)

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-min-32-chars
OPENAI_API_KEY=sk-...
LANGFUSE_SECRET_KEY=sk-lf-...   # optional
```

---

## Production Deployment

1. Set `NODE_ENV=production`
2. Use `npm run build && npm start`
3. Run `npm run db:migrate` before deploy
4. Configure Redis cluster for multi-instance deployments
5. Set secure `JWT_SECRET` (minimum 32 characters, randomly generated)
6. Enable SSL for PostgreSQL and Redis connections

---

## License

MIT — Enterprise use permitted.
