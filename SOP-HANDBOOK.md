# AI Governance Control Tower
## Standard Operating Procedure (SOP) Handbook
### Enterprise Edition — DPDP / ISO 42001 Compliance Platform

---

**Document Version:** 1.0
**Effective Date:** April 2026
**Classification:** Internal Use Only
**Owner:** AI Governance Team

---

## Table of Contents

1. [Introduction & Purpose](#1-introduction--purpose)
2. [System Overview](#2-system-overview)
3. [User Roles & Access Control](#3-user-roles--access-control)
4. [Getting Started](#4-getting-started)
5. [Dashboard — SOP](#5-dashboard--sop)
6. [AI Inventory (Model Registry) — SOP](#6-ai-inventory-model-registry--sop)
7. [Risk & Compliance Engine — SOP](#7-risk--compliance-engine--sop)
8. [Data Governance Module — SOP](#8-data-governance-module--sop)
9. [AI Agent Governance — SOP](#9-ai-agent-governance--sop)
10. [Monitoring & Observability — SOP](#10-monitoring--observability--sop)
11. [Audit & Reports — SOP](#11-audit--reports--sop)
12. [Settings & Administration — SOP](#12-settings--administration--sop)
13. [Incident Response Procedures](#13-incident-response-procedures)
14. [Security & Compliance Procedures](#14-security--compliance-procedures)
15. [Troubleshooting Guide](#15-troubleshooting-guide)
16. [Glossary](#16-glossary)

---

## 1. Introduction & Purpose

### 1.1 Purpose of This Document

This Standard Operating Procedure (SOP) Handbook provides step-by-step guidance for all users of the **AI Governance Control Tower** — an enterprise-grade platform designed to help organisations comply with:

- **DPDP Act** (India's Digital Personal Data Protection Act, 2023)
- **ISO 42001** (AI Management Systems)
- **ISO 42005** (AI System Impact Assessment)
- **Responsible AI Principles**

### 1.2 Scope

This handbook covers:
- All 8 modules of the application
- All three user roles (Admin, Risk Officer, Auditor)
- Day-to-day operational procedures
- Incident response workflows
- Compliance reporting procedures

### 1.3 Who Should Read This

| Audience | Sections to Read |
|---|---|
| New Users (all roles) | Sections 1–5 |
| Risk Officers | Sections 5–10 |
| Auditors | Sections 5, 11 |
| System Administrators | All sections |
| Data Protection Officers | Sections 7, 8, 11, 14 |

### 1.4 Regulatory Alignment

| Regulation | Relevant Modules |
|---|---|
| DPDP Act — Data Principal Rights | Data Governance, Audit |
| DPDP Act — Data Fiduciary Obligations | AI Inventory, Risk Engine |
| ISO 42001 — AI Risk Management | Risk Engine, Monitoring |
| ISO 42001 — AI Governance | Dashboard, Settings |
| ISO 42005 — Impact Assessment | Risk Engine, Reports |
| Responsible AI | Agent Governance, Monitoring |

---

## 2. System Overview

### 2.1 Application Architecture

```
┌─────────────────────────────────────────────────────┐
│              AI Governance Control Tower             │
├─────────────────────────────────────────────────────┤
│  Frontend: Next.js 14 (App Router) + TypeScript      │
│  UI: Tailwind CSS + shadcn/ui                        │
│  State: Zustand                                      │
├─────────────────────────────────────────────────────┤
│  Backend: Next.js API Routes                         │
│  Database: PostgreSQL (via Prisma ORM)               │
│  Cache: Redis                                        │
│  Auth: JWT + RBAC                                    │
├─────────────────────────────────────────────────────┤
│  AI: OpenAI / Azure OpenAI Integration               │
│  Logging: LLM Middleware + Audit Trails              │
└─────────────────────────────────────────────────────┘
```

### 2.2 Core Modules

| # | Module | URL Path | Primary Users |
|---|---|---|---|
| 1 | Dashboard | `/` | All |
| 2 | AI Inventory | `/models` | Admin, Risk Officer |
| 3 | Risk & Compliance | `/risk` | Risk Officer |
| 4 | Data Governance | `/data-governance` | Admin, DPO |
| 5 | Agent Governance | `/agents` | Admin, Risk Officer |
| 6 | Monitoring | `/monitoring` | Risk Officer |
| 7 | Audit & Reports | `/audit` | Auditor, Admin |
| 8 | Settings | `/settings` | Admin only |

### 2.3 System URLs

| Environment | URL |
|---|---|
| Local Development | `http://localhost:3000` |
| Production | As configured by your IT team |

---

## 3. User Roles & Access Control

### 3.1 Role Definitions

#### ADMIN
- **Full access** to all modules
- Can create, edit, delete AI models, agents, users
- Can manage API keys and system configuration
- Can view all audit logs
- Responsible for system-wide governance setup

#### RISK OFFICER
- Can view and manage AI inventory
- Can perform and review risk assessments
- Can view compliance controls
- Can monitor AI model behaviour
- Cannot access Settings or manage users
- Cannot delete records (read + write, no delete)

#### AUDITOR
- **Read-only access** to all modules
- Can generate and export compliance reports
- Can view all audit logs
- Cannot create, edit, or delete any records
- Primary users for regulatory audits

### 3.2 Access Matrix

| Feature | Admin | Risk Officer | Auditor |
|---|---|---|---|
| View Dashboard | ✅ | ✅ | ✅ |
| Add AI Model | ✅ | ✅ | ❌ |
| Edit AI Model | ✅ | ✅ | ❌ |
| Delete AI Model | ✅ | ❌ | ❌ |
| Run Risk Assessment | ✅ | ✅ | ❌ |
| View Risk Reports | ✅ | ✅ | ✅ |
| Manage Data Assets | ✅ | ✅ | ❌ |
| View Audit Logs | ✅ | ❌ | ✅ |
| Export Reports | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage API Keys | ✅ | ❌ | ❌ |
| Configure Policies | ✅ | ❌ | ❌ |

### 3.3 Default User Accounts (Seed Data)

| Email | Password | Role |
|---|---|---|
| `admin@governance.ai` | `Admin@1234!` | Admin |
| `risk@governance.ai` | `Admin@1234!` | Risk Officer |
| `audit@governance.ai` | `Admin@1234!` | Auditor |

> ⚠️ **IMPORTANT:** Change all default passwords immediately after first login in production.

---

## 4. Getting Started

### 4.1 First-Time Login

**Step 1:** Open your browser and navigate to `http://localhost:3000`

**Step 2:** You will see the **Sign In** screen with the AI Governance branding.

**Step 3:** Enter your credentials:
- Email: `admin@governance.ai`
- Password: `Admin@1234!`

**Step 4:** Click **Sign In**

**Step 5:** You will be redirected to the **Dashboard**

**Step 6:** ⚠️ Immediately go to **Settings** → **Profile** and change your password.

### 4.2 Navigation Overview

Once logged in, you'll see:

```
┌────────────────────────────────────────────────────┐
│  [≡] AI Governance Control Tower    [🔔] [👤 Admin] │  ← Header
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│ Sidebar  │           Main Content Area             │
│          │                                         │
│ 📊 Dashboard     │                                │
│ 🤖 AI Models     │                                │
│ ⚠️  Risk          │                                │
│ 🗄️  Data Gov      │                                │
│ 🤖 Agents        │                                │
│ 📡 Monitoring    │                                │
│ 📋 Audit         │                                │
│ ⚙️  Settings      │                                │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

### 4.3 Collapsing the Sidebar

Click the **hamburger menu (≡)** icon in the header to collapse/expand the sidebar for more screen space.

### 4.4 Notifications

The **bell icon (🔔)** in the top-right shows system alerts and notifications. Click it to view active governance alerts.

### 4.5 Logging Out

Click your **profile name** in the top-right corner → **Sign Out**

---

## 5. Dashboard — SOP

### 5.1 Purpose

The Dashboard provides a real-time executive overview of your organisation's AI governance posture.

### 5.2 KPI Cards — How to Read Them

| KPI Card | What It Means | Action Required If... |
|---|---|---|
| **Total AI Models** | Number of registered AI models | > 20 models without recent assessment |
| **Risk Score** | Average risk across all models (0–100) | Score exceeds 70 (High Risk threshold) |
| **Compliance Score** | % of controls marked Compliant | Score drops below 80% |
| **Active Incidents** | Open governance incidents | Any value > 0 requires investigation |

### 5.3 Reading the Risk Heatmap

The heatmap shows risk concentration across model categories:
- **Red zones** = High risk, immediate action needed
- **Orange zones** = Medium risk, schedule assessment
- **Green zones** = Low risk, routine monitoring

### 5.4 Alerts Panel

The Alerts panel lists active governance alerts ordered by severity:

| Severity | Colour | Response Time |
|---|---|---|
| CRITICAL | 🔴 Red | Immediate (within 1 hour) |
| HIGH | 🟠 Orange | Same business day |
| MEDIUM | 🟡 Yellow | Within 3 business days |
| LOW | 🟢 Green | Within 1 week |

### 5.5 Daily Dashboard Review Procedure

**Who:** Risk Officer or Admin
**Frequency:** Every business day, morning
**Time required:** 10–15 minutes

1. Log in and navigate to Dashboard
2. Check all 4 KPI cards — note any significant changes from previous day
3. Review Alerts panel — action any CRITICAL or HIGH alerts immediately
4. Check the Risk Heatmap — identify any new red zones
5. Review AI usage trend chart — flag unusual spikes
6. Document observations in the daily governance log (Audit module)

---

## 6. AI Inventory (Model Registry) — SOP

### 6.1 Purpose

The AI Inventory is the single source of truth for all AI models deployed in your organisation. Every AI model — regardless of vendor, type, or use case — MUST be registered here.

### 6.2 What Counts as an "AI Model"

Register the following:
- ✅ LLM-based chatbots and assistants
- ✅ Machine learning prediction models
- ✅ AI-powered automation agents
- ✅ Third-party AI APIs (OpenAI, Azure AI, etc.)
- ✅ Computer vision models
- ✅ Recommendation engines
- ✅ Fraud detection systems
- ✅ Any system using statistical/probabilistic decision-making

### 6.3 Registering a New AI Model

**Who:** Admin or Risk Officer
**When:** Before any AI model is deployed to production

**Steps:**

1. Navigate to **AI Models** in the sidebar
2. Click the **+ Add Model** button (top right)
3. Fill in the registration form:

| Field | Description | Example |
|---|---|---|
| **Model Name** | Official name of the model | "Customer Churn Predictor v2" |
| **Type** | LLM / ML / Agent / Vision / Other | "ML" |
| **Version** | Current version/build | "2.1.4" |
| **Owner** | Person responsible for this model | "Data Science Team" |
| **Department** | Business unit | "Risk & Analytics" |
| **Description** | What does this model do? | "Predicts customer churn..." |
| **Risk Level** | LOW / MEDIUM / HIGH | "HIGH" (if handles PII) |
| **Status** | ACTIVE / INACTIVE / DEPRECATED | "ACTIVE" |
| **Tags** | Categorisation tags | "PII", "Financial", "Critical" |
| **Vendor** | If third-party | "OpenAI" |
| **Endpoint** | API endpoint (if applicable) | "https://api.openai.com/v1" |

4. Click **Save Model**
5. System automatically creates an audit log entry
6. Proceed to Risk Assessment (Section 7)

### 6.4 Risk Level Classification Guide

| Risk Level | Criteria |
|---|---|
| **LOW** | No PII processing, internal use only, human reviews all decisions |
| **MEDIUM** | Limited PII, automated decisions with human override available |
| **HIGH** | Processes sensitive PII, fully automated decisions, affects individuals' rights |

### 6.5 Mandatory Tags

Apply these tags where applicable:

| Tag | When to Apply |
|---|---|
| **PII** | Model processes any personal data |
| **Financial** | Model handles financial transactions or scoring |
| **Critical** | System failure would cause significant business impact |
| **Healthcare** | Model used in medical/health decisions |
| **HR** | Model used in hiring or employee decisions |
| **Customer-Facing** | Model directly interacts with customers |

### 6.6 Editing a Model

1. Navigate to **AI Models**
2. Find the model in the table (use search bar if needed)
3. Click the model row to open the **Detail Drawer** on the right
4. Click **Edit** button
5. Make changes
6. Click **Save** — changes are logged automatically

### 6.7 Deprecating a Model

> ⚠️ Never delete a model that has historical assessments. Always deprecate it instead.

1. Open the model detail drawer
2. Change **Status** to `DEPRECATED`
3. Add a deprecation note in the Description field
4. Click Save

### 6.8 Quarterly AI Inventory Review

**Who:** Admin + Risk Officer
**Frequency:** Every quarter
**Purpose:** Ensure inventory is accurate and complete

Checklist:
- [ ] All active models have been assessed in last 90 days
- [ ] No models in ACTIVE status that are actually decommissioned
- [ ] All new models deployed in last 90 days are registered
- [ ] Risk levels reviewed and updated if model usage has changed
- [ ] Owner and department information is current
- [ ] Tags are accurate and complete

---

## 7. Risk & Compliance Engine — SOP

### 7.1 Purpose

The Risk Engine automatically scores AI models based on multiple governance factors and maps them to compliance controls under DPDP and ISO 42001.

### 7.2 Risk Scoring Formula

The system uses a weighted scoring formula:

```
Risk Score = (
  Data Sensitivity Score    × 30% +
  Model Complexity Score    × 20% +
  Explainability Score      × 20% +
  Human Oversight Score     × 20% +
  Deployment Scale Score    × 10%
) × 100
```

| Factor | Score Range | Meaning |
|---|---|---|
| Data Sensitivity | 0–1 | 0=No PII, 1=Highly Sensitive PII |
| Model Complexity | 0–1 | 0=Simple rules, 1=Black-box LLM |
| Explainability | 0–1 | 0=Fully explainable, 1=No explanation |
| Human Oversight | 0–1 | 0=Full human review, 1=Fully automated |
| Deployment Scale | 0–1 | 0=Internal/Limited, 1=Millions of users |

**Final Score Bands:**
- **0–30:** LOW risk ✅
- **31–60:** MEDIUM risk ⚠️
- **61–100:** HIGH risk 🔴

### 7.3 Running a Risk Assessment

**Who:** Risk Officer or Admin
**When:** At model registration, and every 90 days thereafter
**Time required:** 15–30 minutes per model

**Steps:**

1. Navigate to **Risk & Compliance** in the sidebar
2. Click **Assess Model** button
3. Select the model from the dropdown
4. Answer all assessment questions:

**Section A — Data Sensitivity**
- Does the model process personal data? (Yes/No)
- If yes, what category? (General / Sensitive / Special Category)
- Is the data encrypted at rest and in transit?

**Section B — Model Type & Complexity**
- What is the model architecture? (Rule-based / ML / Deep Learning / LLM)
- Is the model a black box? (Yes/No)
- Can predictions be explained to end users?

**Section C — Human Oversight**
- Are model decisions reviewed by a human before action?
- Is there a human override mechanism?
- What is the review percentage? (All / Sample / None)

**Section D — Deployment & Scale**
- How many users are affected by model decisions daily?
- Is the model customer-facing?
- What is the impact of an incorrect decision?

5. Click **Calculate Risk Score**
6. Review the generated score and recommendations
7. Click **Save Assessment**
8. System creates audit log entry automatically

### 7.4 Compliance Control Checklist

After assessment, review the compliance control mapping:

#### DPDP Controls

| Control | Description | Status Options |
|---|---|---|
| DPDP-01 | Data Principal consent obtained | Compliant / Non-Compliant / Partial |
| DPDP-02 | Purpose limitation documented | Compliant / Non-Compliant / Partial |
| DPDP-03 | Data minimisation applied | Compliant / Non-Compliant / Partial |
| DPDP-04 | Right to erasure mechanism exists | Compliant / Non-Compliant / Partial |
| DPDP-05 | Data breach notification procedure | Compliant / Non-Compliant / Partial |
| DPDP-06 | Significant Data Fiduciary obligations | Compliant / Non-Compliant / Partial |

#### ISO 42001 Controls

| Control | Description | Status Options |
|---|---|---|
| ISO-4.1 | AI governance policy established | Compliant / Non-Compliant / Partial |
| ISO-6.1 | AI risk assessment process | Compliant / Non-Compliant / Partial |
| ISO-8.1 | AI system development controls | Compliant / Non-Compliant / Partial |
| ISO-8.4 | AI system documentation | Compliant / Non-Compliant / Partial |
| ISO-9.1 | AI performance monitoring | Compliant / Non-Compliant / Partial |
| ISO-10.1 | Continual improvement process | Compliant / Non-Compliant / Partial |

### 7.5 Updating Control Status

1. Navigate to **Risk & Compliance** → **Controls** tab
2. Find the control to update
3. Click the status badge (Compliant/Non-Compliant/Partial)
4. Select the new status
5. Add a note explaining the change
6. Click Save — action is automatically audit logged

### 7.6 Escalation Thresholds

| Score | Action Required |
|---|---|
| Score > 80 | Immediate escalation to CISO and DPO |
| Score 61–80 | Risk Officer must create remediation plan within 5 days |
| Score 31–60 | Review at next governance meeting |
| Score < 30 | Routine monitoring, no immediate action |

---

## 8. Data Governance Module — SOP

### 8.1 Purpose

The Data Governance module manages data lineage, PII detection, and consent tracking — directly supporting DPDP compliance obligations.

### 8.2 Registering a Data Asset

**Who:** Admin or Risk Officer
**When:** When a new data source is connected to any AI model

1. Navigate to **Data Governance**
2. Click **+ Add Data Asset**
3. Fill in:

| Field | Description |
|---|---|
| **Asset Name** | e.g., "Customer Transaction DB" |
| **Type** | DATABASE / API / FILE / STREAM |
| **Classification** | PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED |
| **Contains PII** | Yes / No |
| **PII Types** | Name, Email, Phone, Aadhaar, PAN, Financial, Health |
| **Source System** | Origin system name |
| **Owner** | Data owner contact |
| **Linked Models** | Which AI models use this data |

4. Click **Save**

### 8.3 Data Classification Levels

| Level | Description | Examples |
|---|---|---|
| **PUBLIC** | No restrictions | Marketing materials |
| **INTERNAL** | Internal use only | Employee directories |
| **CONFIDENTIAL** | Sensitive business data | Customer PII, financial data |
| **RESTRICTED** | Highly sensitive, limited access | Aadhaar, medical records, PAN |

### 8.4 PII Detection & Tagging

When registering data assets, always tag PII types present:

| PII Category | DPDP Classification | Risk Weight |
|---|---|---|
| Name, Address | Personal Data | Medium |
| Phone, Email | Personal Data | Medium |
| Aadhaar Number | Sensitive Personal Data | High |
| PAN / Financial | Sensitive Personal Data | High |
| Health Records | Special Category | Very High |
| Biometrics | Special Category | Very High |
| Children's Data | Special Category (Enhanced) | Critical |

### 8.5 Consent Record Management

Under DPDP, every data principal must provide informed consent before their data is used by an AI model.

**Recording Consent:**

1. Navigate to **Data Governance** → **Consent Records**
2. Click **+ Log Consent**
3. Fill in:
   - Data Principal ID (anonymised identifier)
   - Consent Type (Explicit / Implied)
   - Purpose (must match model's stated purpose)
   - Linked AI Model
   - Consent Date
   - Expiry Date (if applicable)
   - Consent Channel (Web / App / Paper / Phone)
4. Click **Save**

**Consent Withdrawal:**

1. Find the consent record by Data Principal ID
2. Click **Withdraw**
3. System logs withdrawal with timestamp
4. Linked models must be updated to exclude this data principal

### 8.6 Data Lineage Review

The lineage view shows: **Source → Processing → Model → Output**

Use this to:
- Verify data flows are as documented
- Identify unexpected data sources feeding a model
- Demonstrate compliance to auditors

**Monthly Lineage Review Procedure:**
1. Navigate to **Data Governance** → **Lineage**
2. For each HIGH risk model, trace the full data lineage
3. Verify no undocumented data sources
4. Confirm all data sources have current consent records
5. Document review in Audit module

---

## 9. AI Agent Governance — SOP

### 9.1 Purpose

AI Agents (LLM-powered autonomous systems) require special governance because they can take actions, call external tools, and produce outputs that directly affect users and business processes.

### 9.2 Registering an Agent

**Who:** Admin
**When:** Before any agent is deployed or tested in production

1. Navigate to **Agents**
2. Click **+ Register Agent**
3. Fill in:

| Field | Description |
|---|---|
| **Agent Name** | Descriptive name |
| **Model** | Base LLM (GPT-4, Claude, etc.) |
| **Version** | Agent version |
| **System Prompt** | The system prompt used (stored securely) |
| **Tools Allowed** | List of tools the agent can call |
| **Max Tokens** | Token limit per call |
| **Temperature** | Creativity setting (0–1) |
| **Status** | ACTIVE / INACTIVE / TESTING |
| **Owner** | Responsible team |

4. Click **Save**

### 9.3 Monitoring Agent Behaviour

**Frequency:** Daily for ACTIVE agents

1. Navigate to **Agents**
2. Click on an agent to view its **Prompt Logs**
3. Review recent interactions for:

| Flag | Description | Action |
|---|---|---|
| 🔴 **Hallucination** | Response contains factual errors | Review and retrain |
| 🔴 **Policy Violation** | Response violates content policy | Immediate suspension |
| 🟠 **Prompt Injection** | Attempt to override system prompt | Security review |
| 🟡 **High Token Usage** | Unusual token consumption | Cost and security check |
| 🟡 **Tool Abuse** | Excessive or unexpected tool calls | Review tool permissions |

### 9.4 Viewing the Prompt → Tool → Response Flow

1. Navigate to **Agents** → Select agent
2. Click **View Logs**
3. Each log entry shows:
   ```
   [Prompt] User input received
       ↓
   [Tools] Tools called: search_db, calculate_risk
       ↓
   [Response] Final response generated
       ↓
   [Flags] Any policy violations detected
   ```
4. Click any log entry to expand full details

### 9.5 Suspending an Agent

If a policy violation is detected:

1. Navigate to **Agents**
2. Find the offending agent
3. Click **Edit**
4. Change Status to `INACTIVE`
5. Add suspension reason in Description
6. Click Save
7. Notify relevant stakeholders
8. Create an incident record in Audit module

### 9.6 Agent Prompt Change Procedure

Any change to an agent's system prompt is a HIGH risk change and requires:

1. Risk Officer approval
2. Testing in non-production environment first
3. Documentation of old prompt → new prompt
4. Post-change monitoring for 48 hours
5. Audit log entry with change justification

---

## 10. Monitoring & Observability — SOP

### 10.1 Purpose

The Monitoring module provides real-time and historical visibility into AI model performance, including accuracy, drift, latency, and safety signals.

### 10.2 Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|---|---|---|
| **Latency (P95)** | 95th percentile response time | > 5000ms |
| **Error Rate** | % of failed requests | > 5% |
| **Toxicity Score** | % of responses flagged toxic | > 1% |
| **Bias Score** | Bias detection metric | > 0.3 |
| **Drift Score** | Model output drift from baseline | > 0.2 |
| **Manual Accuracy** | Human-scored accuracy | < 85% |

### 10.3 Daily Monitoring Procedure

**Who:** Risk Officer
**Time:** 20 minutes each morning

1. Navigate to **Monitoring**
2. Set date range to "Last 24 hours"
3. Review **Prompt Logs** — look for errors or unusual patterns
4. Check **Metrics** panel:
   - Accuracy above 85%? If not, flag for review
   - Any drift detected? If yes, initiate model review
5. Review **Alerts** section:
   - Bias alerts → escalate to Risk Officer immediately
   - Toxicity alerts → review flagged responses, consider suspension
6. Export daily metrics if required for reporting
7. Document any findings in Audit module

### 10.4 Reviewing Prompt Logs

1. Navigate to **Monitoring** → **Prompt Logs**
2. Filter by:
   - Model name
   - Date range
   - Status (Success / Error / Flagged)
3. Click any log entry to view:
   - Full prompt text
   - Full response text
   - Latency (ms)
   - Token count
   - Any flags raised

### 10.5 Drift Detection Procedure

Drift occurs when a model's behaviour changes significantly from its baseline.

**When drift is detected:**
1. Review drift score in Monitoring dashboard
2. Compare current outputs to baseline samples
3. Identify root cause:
   - Data distribution shift?
   - Model update by vendor?
   - Prompt template change?
4. If unexplained: suspend model, escalate to Data Science team
5. Document in Audit trail
6. Re-baseline after resolution

### 10.6 Setting Up Alerts

1. Navigate to **Settings** → **Alert Configuration**
2. Configure thresholds for each metric
3. Set notification recipients (email/Slack)
4. Enable/disable specific alert types

---

## 11. Audit & Reports — SOP

### 11.1 Purpose

The Audit module maintains a tamper-evident record of all actions taken in the system. This is critical for regulatory compliance and incident investigation.

### 11.2 Audit Log — What is Recorded

Every action is automatically logged:

| Action | What's Recorded |
|---|---|
| User Login | Timestamp, IP, User Agent |
| Model Created | All field values, who created |
| Model Edited | Before/after field values |
| Risk Assessment | Full assessment data, score |
| Compliance Status Changed | Old status, new status, who changed |
| Report Generated | Report type, generated by, timestamp |
| Agent Suspended | Reason, who, timestamp |
| API Key Created/Deleted | Key reference (not value), who |

### 11.3 Searching Audit Logs

1. Navigate to **Audit**
2. Use filters:
   - **Date Range:** Select start and end date
   - **User:** Filter by specific user
   - **Action Type:** LOGIN / CREATE / UPDATE / DELETE / EXPORT
   - **Resource:** models / agents / compliance / settings
3. Click **Search**
4. Results show in chronological order (newest first)

### 11.4 Generating Compliance Reports

**Who:** Admin or Auditor
**When:** Quarterly minimum, or on regulatory request

#### DPDP Compliance Report
1. Navigate to **Audit** → **Reports**
2. Select **DPDP Compliance Report**
3. Set reporting period (typically last 90 days)
4. Click **Generate Report**
5. Report includes:
   - Total models processing personal data
   - Consent coverage percentage
   - Data breaches (if any)
   - Rights request fulfilment status
   - Control compliance summary
6. Click **Export PDF** or **Export CSV**

#### AI Risk Report (ISO 42001)
1. Navigate to **Audit** → **Reports**
2. Select **AI Risk Report**
3. Set reporting period
4. Click **Generate Report**
5. Report includes:
   - All model risk scores
   - Risk trend over time
   - High risk models requiring attention
   - Compliance control status
   - Incident summary
6. Export as needed

### 11.5 Responding to Regulatory Requests

When a regulator (e.g., Data Protection Board of India) requests information:

1. **Within 24 hours of request:**
   - Notify Legal and DPO
   - Create an audit log entry recording the request

2. **Within 48 hours:**
   - Generate relevant reports (DPDP Compliance + AI Risk)
   - Export raw audit logs for requested period
   - Compile Data Asset inventory with lineage

3. **Before submission:**
   - Legal review of all documents
   - Admin exports final package
   - Create audit log entry for submission

4. **After submission:**
   - Document response in system
   - Schedule follow-up review

### 11.6 Report Retention Policy

| Report Type | Retention Period |
|---|---|
| DPDP Compliance Reports | 5 years |
| AI Risk Reports | 3 years |
| Audit Log Exports | 7 years |
| Incident Reports | 7 years |
| Consent Records | Duration of relationship + 3 years |

---

## 12. Settings & Administration — SOP

> ⚠️ Settings are accessible to **ADMIN role only**

### 12.1 User Management

#### Adding a New User

1. Navigate to **Settings** → **Users**
2. Click **+ Invite User**
3. Enter:
   - Full Name
   - Email Address
   - Role (Admin / Risk Officer / Auditor)
   - Department
4. Click **Send Invitation**
5. User receives an email with a registration link
6. User sets their own password on first login

#### Deactivating a User

When an employee leaves or changes roles:

1. Navigate to **Settings** → **Users**
2. Find the user
3. Click **Deactivate**
4. User is immediately blocked from login
5. Their audit logs are preserved
6. Do NOT delete users — deactivate only

#### Changing a User's Role

1. Navigate to **Settings** → **Users**
2. Find the user
3. Click **Edit**
4. Change the Role dropdown
5. Click **Save**
6. User's new permissions apply on next login

### 12.2 API Key Management

API keys allow external systems to integrate with the Governance Tower API.

#### Creating an API Key

1. Navigate to **Settings** → **API Keys**
2. Click **+ Generate New Key**
3. Enter:
   - Key Name (descriptive label)
   - Expiry Date (maximum 1 year)
   - Permissions (Read / Read-Write)
4. Click **Generate**
5. **Copy the key immediately** — it will not be shown again
6. Store the key in your organisation's secrets manager (not in email or documents)

#### Rotating an API Key

Rotate keys every 90 days or immediately if compromised:

1. Navigate to **Settings** → **API Keys**
2. Find the key to rotate
3. Click **Rotate**
4. New key is generated — copy immediately
5. Update all systems using the old key
6. Delete the old key after all systems are updated

#### Revoking a Compromised Key

If an API key is compromised:
1. Navigate to **Settings** → **API Keys**
2. Find the compromised key
3. Click **Revoke** — takes effect immediately
4. Create incident record in Audit module
5. Investigate how the key was compromised
6. Generate a new key and update legitimate systems

### 12.3 Policy Configuration

1. Navigate to **Settings** → **Policies**
2. Configure:
   - Risk score thresholds for alerts
   - Auto-escalation rules
   - Review frequency requirements
   - Data retention periods
   - Allowed model types and vendors
3. Click **Save Policy**
4. All policy changes are audit logged

---

## 13. Incident Response Procedures

### 13.1 Incident Severity Levels

| Level | Description | Examples |
|---|---|---|
| **SEV-1 Critical** | Immediate threat to data or regulatory compliance | Data breach, mass PII exposure |
| **SEV-2 High** | Significant governance failure | High-risk model producing biased decisions |
| **SEV-3 Medium** | Governance gap discovered | Model found unregistered |
| **SEV-4 Low** | Minor deviation | Assessment overdue by a few days |

### 13.2 Incident Response Workflow

```
INCIDENT DETECTED
      ↓
1. CONTAIN (0–1 hour for SEV-1)
   - Suspend affected model/agent
   - Preserve evidence
      ↓
2. ASSESS (1–4 hours)
   - Determine scope and impact
   - Classify severity
   - Notify stakeholders
      ↓
3. REMEDIATE (per severity SLA)
   - Fix root cause
   - Update controls
   - Re-assess risk
      ↓
4. DOCUMENT (within 24 hours of resolution)
   - Create audit log entry
   - Update compliance controls
   - Write incident report
      ↓
5. REVIEW (within 1 week)
   - Post-incident review meeting
   - Update SOPs if needed
   - Implement preventive measures
```

### 13.3 Data Breach Response (DPDP Requirement)

Under DPDP, a personal data breach must be reported to the **Data Protection Board of India** within **72 hours** of becoming aware.

**Immediate steps (0–6 hours):**
1. Suspend all affected AI models
2. Preserve all logs from Monitoring module
3. Export audit trail from Audit module
4. Notify DPO and Legal
5. Begin impact assessment

**Within 24 hours:**
1. Identify all affected data principals
2. Determine categories of data exposed
3. Draft breach notification to Data Protection Board
4. Prepare communication for affected individuals

**Within 72 hours:**
1. Submit breach notification to Data Protection Board
2. Notify affected data principals (if required)
3. Document all above in Audit module

### 13.4 AI Model Suspension Procedure

If a model needs to be suspended due to governance issues:

1. Navigate to **AI Models**
2. Open the model
3. Change Status to `INACTIVE`
4. Navigate to **Audit** → **Create Entry**
5. Document: what happened, who decided, why
6. Notify model owner and business stakeholders
7. Create remediation plan with target resolution date
8. Only re-activate after Risk Officer approval and re-assessment

---

## 14. Security & Compliance Procedures

### 14.1 Password Policy

| Requirement | Rule |
|---|---|
| Minimum length | 12 characters |
| Complexity | Upper + lower + number + special character |
| Expiry | Every 90 days |
| History | Cannot reuse last 10 passwords |
| MFA | Recommended for Admin accounts |

### 14.2 Session Management

- Sessions expire after **8 hours** of inactivity
- Always click **Sign Out** when leaving your workstation
- Never share login credentials
- Report suspected unauthorised access immediately

### 14.3 Access Review Procedure

**Frequency:** Every 6 months
**Who:** Admin

1. Navigate to **Settings** → **Users**
2. Review all active user accounts:
   - Still employed?
   - Correct role for current job function?
   - Last login date — if > 60 days, investigate
3. Deactivate any accounts that are no longer needed
4. Document review in Audit module

### 14.4 Environment Variable Security

The following `.env` variables must be kept secret:

| Variable | Sensitivity | Rotation Frequency |
|---|---|---|
| `DATABASE_URL` | Critical | On staff changes |
| `JWT_SECRET` | Critical | Every 6 months |
| `OPENAI_API_KEY` | High | Every 90 days |
| `REDIS_URL` | Medium | Annually |

Never:
- Commit `.env` to version control
- Share `.env` via email or chat
- Log these values in any monitoring system

### 14.5 Regular Security Tasks

| Task | Frequency | Who |
|---|---|---|
| Review audit logs | Daily | Auditor |
| Rotate API keys | Every 90 days | Admin |
| Access review | Every 6 months | Admin |
| Risk reassessment | Every 90 days | Risk Officer |
| Password rotation | Every 90 days | All users |
| Backup verification | Monthly | IT/Admin |

---

## 15. Troubleshooting Guide

### 15.1 Cannot Log In

| Symptom | Likely Cause | Solution |
|---|---|---|
| "Invalid credentials" | Wrong password | Check caps lock; try password reset |
| "Network error" | API server issue | Check terminal running `npm run dev` |
| Redirected back to login | Missing auth cookie | Clear browser cookies and try again |
| "Account inactive" | Admin deactivated account | Contact Admin |

### 15.2 Data Not Loading

| Symptom | Solution |
|---|---|
| Dashboard shows no data | Run `npm run db:seed` and refresh |
| Models table empty | Seed not run, or no models created yet |
| Charts not rendering | Hard refresh (Ctrl+Shift+R) |

### 15.3 Database Connection Error

```
Error: P1000 Authentication failed
```
**Solution:** Check `DATABASE_URL` in `.env` — verify the PostgreSQL password is correct.

```
Error: Can't reach database server
```
**Solution:** Ensure PostgreSQL service is running:
- Windows: Open Services → Find "postgresql-x64-15" → Start

### 15.4 Application Won't Start

```
Error: Cannot find module '@prisma/client'
```
**Solution:**
```bash
npm run db:generate
npm run dev
```

```
Port 3000 already in use
```
**Solution:**
```bash
npm run dev -- -p 3001
```

### 15.5 Common User Errors

| Error | Cause | Solution |
|---|---|---|
| Can't see Settings menu | Not an Admin | Contact your Admin |
| Can't edit a model | Read-only Auditor role | Contact your Admin for role change |
| Report won't export | No data in date range | Expand the date range |
| Assessment won't save | Incomplete form | Fill all required fields (marked with *) |

---

## 16. Glossary

| Term | Definition |
|---|---|
| **AI Model** | Any artificial intelligence or machine learning system that processes data and produces outputs |
| **Agent** | An autonomous AI system that can take actions, use tools, and make decisions |
| **Audit Log** | A tamper-evident record of all actions taken in the system |
| **DPDP** | Digital Personal Data Protection Act (India, 2023) |
| **Data Fiduciary** | Organisation that determines the purpose and means of processing personal data |
| **Data Principal** | The individual whose personal data is being processed |
| **Drift** | When a model's behaviour changes significantly from its training baseline |
| **Hallucination** | When an LLM generates factually incorrect or fabricated information |
| **ISO 42001** | International standard for AI Management Systems |
| **ISO 42005** | International standard for AI System Impact Assessment |
| **JWT** | JSON Web Token — used for authentication |
| **LLM** | Large Language Model (e.g., GPT-4, Claude) |
| **PII** | Personally Identifiable Information |
| **Prompt Injection** | An attack where malicious input attempts to override an AI system's instructions |
| **RBAC** | Role-Based Access Control — permissions determined by user role |
| **Risk Score** | A numerical value (0–100) representing the governance risk of an AI model |
| **SDF** | Significant Data Fiduciary — organisations processing large volumes of sensitive data |
| **System Prompt** | Instructions given to an LLM that define its behaviour and constraints |
| **Token** | The unit of text processing used by LLMs |
| **Toxicity** | AI output that is harmful, offensive, or inappropriate |

---

## Quick Reference Card

### Daily Tasks by Role

#### Admin (15 min/day)
- [ ] Check Dashboard alerts
- [ ] Review any new user registrations
- [ ] Monitor active incidents

#### Risk Officer (30 min/day)
- [ ] Review Dashboard KPIs
- [ ] Check Monitoring for alerts
- [ ] Review Agent logs for flags
- [ ] Action any HIGH/CRITICAL alerts

#### Auditor (20 min/day)
- [ ] Review Audit logs
- [ ] Check compliance control statuses
- [ ] Note any upcoming report deadlines

---

### Emergency Contacts

| Role | Responsibility |
|---|---|
| System Admin | Application access, technical issues |
| Data Protection Officer | DPDP compliance, breach notification |
| Chief Information Security Officer | Security incidents |
| Risk Officer | Model governance, risk escalation |

---

*This document should be reviewed and updated quarterly or whenever significant changes are made to the application or regulatory requirements.*

**Document Control:**
- Author: AI Governance Team
- Review Date: July 2026
- Next Review: October 2026
- Approved By: Chief AI Officer
