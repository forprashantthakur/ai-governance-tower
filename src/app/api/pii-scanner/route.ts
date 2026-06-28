import { z } from "zod";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// ── Input schema ──────────────────────────────────────────────────────────────

const ScanSchema = z.object({
  // Raw text: SQL CREATE TABLE, CSV header row, JSON keys, or newline-separated column names
  input: z.string().min(1).max(20000),
  // Optional: sample values for each column keyed by column name (for value-level regex checks)
  sampleValues: z.record(z.string()).optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Confidence = "HIGH" | "MEDIUM" | "LOW";

interface PiiDetectionResult {
  columnName: string;
  normalizedName: string;
  isPii: boolean;
  confidence: Confidence;
  piiCategory: string;
  dpdpCategory: string; // DPDP Act 2023 classification
  isSpecialCategory: boolean; // DPDP Sec. special categories (health, biometric, etc.)
  regulation: string;
  reason: string;
}

// ── PII Rule Engine ───────────────────────────────────────────────────────────

interface PiiRule {
  patterns: RegExp[];
  piiCategory: string;
  dpdpCategory: string;
  isSpecialCategory: boolean;
  regulation: string;
  confidence: Confidence;
  reason: string;
}

// Rules listed from most-specific (HIGH) to least-specific (LOW)
const PII_RULES: PiiRule[] = [
  // ── Indian Government IDs ────────────────────────────────────────────────
  {
    patterns: [/aadh?aar/i, /\buid\b/i, /\buin\b/i],
    piiCategory: "Government ID — Aadhaar",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · IT Rules 2011 Rule 3",
    confidence: "HIGH",
    reason: "Column name matches Aadhaar UID identifier",
  },
  {
    patterns: [/\bpan\b/i, /pan[_\s-]?num/i, /pan[_\s-]?card/i],
    piiCategory: "Government ID — PAN",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · Income Tax Act Sec. 139A",
    confidence: "HIGH",
    reason: "Column name matches PAN (Permanent Account Number)",
  },
  {
    patterns: [/passport/i],
    piiCategory: "Government ID — Passport",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "HIGH",
    reason: "Column name matches passport number field",
  },
  {
    patterns: [/voter/i, /epic[_\s-]?id/i, /election[_\s-]?card/i],
    piiCategory: "Government ID — Voter ID",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "HIGH",
    reason: "Column name matches Voter ID / EPIC number",
  },
  {
    patterns: [/driving[_\s-]?lic/i, /\bdl\b/i, /dl[_\s-]?num/i],
    piiCategory: "Government ID — Driving Licence",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "HIGH",
    reason: "Column name matches Driving Licence number",
  },
  {
    patterns: [/gst[_\s-]?in/i, /gstin/i],
    piiCategory: "Government ID — GSTIN",
    dpdpCategory: "Personal Data — Business Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · GST Act",
    confidence: "HIGH",
    reason: "Column name matches GSTIN (GST registration number)",
  },

  // ── Biometric ────────────────────────────────────────────────────────────
  {
    patterns: [/finger[_\s-]?print/i, /biometric/i, /iris[_\s-]?scan/i, /retina/i, /facial[_\s-]?rec/i, /face[_\s-]?enc/i],
    piiCategory: "Biometric Data",
    dpdpCategory: "Sensitive Personal Data — Biometric (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · IT (SPDI) Rules 2011",
    confidence: "HIGH",
    reason: "Column name matches biometric identifier",
  },
  {
    patterns: [/voice[_\s-]?print/i, /voice[_\s-]?id/i, /speech[_\s-]?pattern/i],
    piiCategory: "Biometric Data — Voice",
    dpdpCategory: "Sensitive Personal Data — Biometric (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8",
    confidence: "HIGH",
    reason: "Column name matches voice biometric data",
  },

  // ── Health & Medical ─────────────────────────────────────────────────────
  {
    patterns: [/health/i, /medical/i, /diagnosis/i, /diagnos/i, /disease/i, /illness/i, /medication/i, /prescription/i, /treatment/i, /surgery/i, /icd[_\s-]?\d/i],
    piiCategory: "Health / Medical Data",
    dpdpCategory: "Sensitive Personal Data — Health (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · IT (SPDI) Rules 2011",
    confidence: "HIGH",
    reason: "Column name matches health/medical information",
  },
  {
    patterns: [/blood[_\s-]?group/i, /blood[_\s-]?type/i, /dna/i, /genome/i, /genetic/i],
    piiCategory: "Health — Genetic / Blood Data",
    dpdpCategory: "Sensitive Personal Data — Health (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · IT (SPDI) Rules 2011",
    confidence: "HIGH",
    reason: "Column name matches genetic or blood group data",
  },
  {
    patterns: [/disability/i, /handicap/i, /mental[_\s-]?health/i, /psychiatric/i],
    piiCategory: "Health — Disability / Mental Health",
    dpdpCategory: "Sensitive Personal Data — Health (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8",
    confidence: "HIGH",
    reason: "Column name matches disability or mental health data",
  },

  // ── Financial ────────────────────────────────────────────────────────────
  {
    patterns: [/account[_\s-]?num/i, /bank[_\s-]?acc/i, /\bacno\b/i, /savings[_\s-]?acc/i],
    piiCategory: "Financial — Bank Account",
    dpdpCategory: "Sensitive Personal Data — Financial (DPDP Sec. 8 / IT SPDI)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · IT (SPDI) Rules 2011 · RBI Guidelines",
    confidence: "HIGH",
    reason: "Column name matches bank account number",
  },
  {
    patterns: [/credit[_\s-]?card/i, /debit[_\s-]?card/i, /card[_\s-]?num/i, /cvv/i, /\bpan\b/i],
    piiCategory: "Financial — Payment Card",
    dpdpCategory: "Sensitive Personal Data — Financial (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · PCI-DSS · RBI",
    confidence: "HIGH",
    reason: "Column name matches payment card data",
  },
  {
    patterns: [/ifsc/i, /rtgs/i, /neft/i, /swift[_\s-]?code/i, /routing[_\s-]?num/i],
    piiCategory: "Financial — Bank Routing",
    dpdpCategory: "Sensitive Personal Data — Financial (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · RBI",
    confidence: "HIGH",
    reason: "Column name matches bank routing / IFSC code",
  },
  {
    patterns: [/salary/i, /income/i, /wage/i, /ctc/i, /compensation/i, /payroll/i],
    piiCategory: "Financial — Income / Salary",
    dpdpCategory: "Personal Data — Financial (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "MEDIUM",
    reason: "Column name matches income/salary data",
  },
  {
    patterns: [/credit[_\s-]?score/i, /cibil/i, /loan[_\s-]?id/i, /emi/i],
    piiCategory: "Financial — Credit Information",
    dpdpCategory: "Personal Data — Financial (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · CICRA 2005",
    confidence: "HIGH",
    reason: "Column name matches credit score / loan data",
  },

  // ── Contact Information ──────────────────────────────────────────────────
  {
    patterns: [/email/i, /e[_\s-]?mail/i, /\bemail_id\b/i],
    piiCategory: "Contact — Email Address",
    dpdpCategory: "Personal Data — Contact (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "HIGH",
    reason: "Column name matches email address field",
  },
  {
    patterns: [/phone/i, /mobile/i, /cell[_\s-]?num/i, /contact[_\s-]?num/i, /\bph\b/i, /\btel\b/i, /telephone/i],
    piiCategory: "Contact — Phone / Mobile Number",
    dpdpCategory: "Personal Data — Contact (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · TRAI",
    confidence: "HIGH",
    reason: "Column name matches phone/mobile number",
  },
  {
    patterns: [/address/i, /street/i, /locality/i, /pincode/i, /zip[_\s-]?code/i, /postal/i],
    piiCategory: "Contact — Physical Address",
    dpdpCategory: "Personal Data — Contact (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "MEDIUM",
    reason: "Column name matches physical address or location",
  },

  // ── Identity & Demographics ──────────────────────────────────────────────
  {
    patterns: [/\bname\b/i, /full[_\s-]?name/i, /first[_\s-]?name/i, /last[_\s-]?name/i, /surname/i, /given[_\s-]?name/i],
    piiCategory: "Identity — Personal Name",
    dpdpCategory: "Personal Data — Identity (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "MEDIUM",
    reason: "Column name matches personal name field",
  },
  {
    patterns: [/date[_\s-]?of[_\s-]?birth/i, /\bdob\b/i, /birth[_\s-]?date/i, /\bage\b/i],
    piiCategory: "Identity — Date of Birth / Age",
    dpdpCategory: "Personal Data — Identity (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "HIGH",
    reason: "Column name matches date of birth or age",
  },
  {
    patterns: [/gender/i, /sex\b/i, /\bmale\b/i, /\bfemale\b/i],
    piiCategory: "Demographics — Gender",
    dpdpCategory: "Personal Data — Demographics (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "MEDIUM",
    reason: "Column name matches gender / sex field",
  },
  {
    patterns: [/religion/i, /caste/i, /community/i, /ethnicity/i, /nationality/i],
    piiCategory: "Demographics — Religion / Caste / Ethnicity",
    dpdpCategory: "Sensitive Personal Data — Social (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · Constitution of India Art. 15",
    confidence: "HIGH",
    reason: "Column name matches sensitive demographic category",
  },
  {
    patterns: [/political[_\s-]?view/i, /political[_\s-]?affil/i, /party[_\s-]?member/i],
    piiCategory: "Demographics — Political Opinion",
    dpdpCategory: "Sensitive Personal Data — Political (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · GDPR Art. 9",
    confidence: "HIGH",
    reason: "Column name matches political opinion / affiliation",
  },
  {
    patterns: [/sexual[_\s-]?orient/i, /\blgbt/i, /marital[_\s-]?status/i],
    piiCategory: "Demographics — Sexual Orientation / Marital Status",
    dpdpCategory: "Sensitive Personal Data — Social (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8",
    confidence: "HIGH",
    reason: "Column name matches sexual orientation or relationship status",
  },

  // ── Digital Identifiers ──────────────────────────────────────────────────
  {
    patterns: [/\bip[_\s-]?addr/i, /ip[_\s-]?address/i, /\bipv4\b/i, /\bipv6\b/i],
    piiCategory: "Digital — IP Address",
    dpdpCategory: "Personal Data — Digital Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · EU AI Act",
    confidence: "MEDIUM",
    reason: "Column name matches IP address field",
  },
  {
    patterns: [/device[_\s-]?id/i, /\bimei\b/i, /\bimsi\b/i, /mac[_\s-]?addr/i, /cookie[_\s-]?id/i],
    piiCategory: "Digital — Device Identifier",
    dpdpCategory: "Personal Data — Digital Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "HIGH",
    reason: "Column name matches device or hardware identifier",
  },
  {
    patterns: [/user[_\s-]?id/i, /\buid\b/i, /customer[_\s-]?id/i, /member[_\s-]?id/i, /profile[_\s-]?id/i],
    piiCategory: "Digital — User Identifier",
    dpdpCategory: "Personal Data — Digital Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "LOW",
    reason: "Column name matches user/customer ID — may link to a person",
  },
  {
    patterns: [/\bssn\b/i, /social[_\s-]?security/i],
    piiCategory: "Government ID — SSN (International)",
    dpdpCategory: "Personal Data — Foreign Govt Identifier",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · GDPR",
    confidence: "HIGH",
    reason: "Column name matches US Social Security Number",
  },
  {
    patterns: [/location/i, /geo[_\s-]?loc/i, /lat(itude)?/i, /lon(gitude)?/i, /gps/i, /coordinates/i],
    piiCategory: "Location — Geo-coordinates",
    dpdpCategory: "Personal Data — Location (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    confidence: "MEDIUM",
    reason: "Column name matches geographic location or GPS coordinates",
  },
  {
    patterns: [/password/i, /passwd/i, /\bpwd\b/i, /secret/i, /credential/i, /auth[_\s-]?token/i, /api[_\s-]?key/i],
    piiCategory: "Security — Credential / Secret",
    dpdpCategory: "Personal Data — Security Credential (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4 · CERT-In",
    confidence: "HIGH",
    reason: "Column name matches password, secret, or API credential",
  },
];

// ── Sample Value Regex Checks ─────────────────────────────────────────────────

interface ValuePattern {
  pattern: RegExp;
  piiCategory: string;
  dpdpCategory: string;
  isSpecialCategory: boolean;
  regulation: string;
  reason: string;
}

const VALUE_PATTERNS: ValuePattern[] = [
  {
    pattern: /^\d{12}$/,
    piiCategory: "Government ID — Aadhaar (value match)",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    reason: "Sample value matches Aadhaar 12-digit format",
  },
  {
    pattern: /^[A-Z]{5}\d{4}[A-Z]$/,
    piiCategory: "Government ID — PAN (value match)",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    reason: "Sample value matches PAN card format (AAAAA9999A)",
  },
  {
    pattern: /^[6-9]\d{9}$/,
    piiCategory: "Contact — Indian Mobile Number (value match)",
    dpdpCategory: "Personal Data — Contact (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    reason: "Sample value matches Indian mobile number format",
  },
  {
    pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    piiCategory: "Financial — IFSC Code (value match)",
    dpdpCategory: "Sensitive Personal Data — Financial (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · RBI",
    reason: "Sample value matches Indian IFSC code format",
  },
  {
    pattern: /^[A-Z]\d{7}$/,
    piiCategory: "Government ID — Passport (value match)",
    dpdpCategory: "Personal Data — Govt Identifier (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    reason: "Sample value matches Indian passport number format",
  },
  {
    pattern: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/,
    piiCategory: "Contact — Email Address (value match)",
    dpdpCategory: "Personal Data — Contact (DPDP Sec. 4)",
    isSpecialCategory: false,
    regulation: "DPDP Act 2023 Sec. 4",
    reason: "Sample value matches email address format",
  },
  {
    pattern: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
    piiCategory: "Financial — Payment Card Number (value match)",
    dpdpCategory: "Sensitive Personal Data — Financial (DPDP Sec. 8)",
    isSpecialCategory: true,
    regulation: "DPDP Act 2023 Sec. 8 · PCI-DSS",
    reason: "Sample value matches 16-digit payment card format",
  },
];

// ── Column Name Parser ────────────────────────────────────────────────────────

function parseColumns(input: string): string[] {
  // Try SQL CREATE TABLE
  const sqlMatch = input.match(/CREATE\s+TABLE[^(]*\(([\s\S]+?)\)[\s;]*$/i);
  if (sqlMatch) {
    const body = sqlMatch[1];
    return body
      .split(",")
      .map((line) => {
        const trimmed = line.trim();
        // Skip constraints / keys
        if (/^\s*(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|INDEX)/i.test(trimmed)) return null;
        // First word is the column name (handle quoted identifiers)
        const m = trimmed.match(/^[`"']?(\w+)[`"']?/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];
  }

  // Try CSV header (comma or tab separated, single line)
  if (!input.includes("\n") || input.split("\n").length <= 2) {
    const sep = input.includes(",") ? "," : "\t";
    const cols = input
      .split("\n")[0]
      .split(sep)
      .map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length > 1) return cols;
  }

  // Try JSON keys (flat object)
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return Object.keys(parsed);
    }
  } catch {
    // not JSON
  }

  // Fall back: newline-separated column names
  return input
    .split(/[\n,;]/)
    .map((l) => l.trim().replace(/^["'`]|["'`]$/g, "").split(/\s+/)[0])
    .filter(Boolean);
}

function normalize(col: string): string {
  return col.toLowerCase().replace(/[_\s-]+/g, "_");
}

// ── Detection Core ────────────────────────────────────────────────────────────

function detectPii(
  columnName: string,
  sampleValue?: string
): Omit<PiiDetectionResult, "columnName"> {
  const norm = normalize(columnName);

  // 1. Name-based rule matching
  for (const rule of PII_RULES) {
    const matched = rule.patterns.some((p) => p.test(columnName) || p.test(norm));
    if (matched) {
      return {
        normalizedName: norm,
        isPii: true,
        confidence: rule.confidence,
        piiCategory: rule.piiCategory,
        dpdpCategory: rule.dpdpCategory,
        isSpecialCategory: rule.isSpecialCategory,
        regulation: rule.regulation,
        reason: rule.reason,
      };
    }
  }

  // 2. Sample value-based detection (if provided)
  if (sampleValue) {
    const trimmed = sampleValue.trim();
    for (const vp of VALUE_PATTERNS) {
      if (vp.pattern.test(trimmed)) {
        return {
          normalizedName: norm,
          isPii: true,
          confidence: "HIGH",
          piiCategory: vp.piiCategory,
          dpdpCategory: vp.dpdpCategory,
          isSpecialCategory: vp.isSpecialCategory,
          regulation: vp.regulation,
          reason: vp.reason,
        };
      }
    }
  }

  // 3. No match
  return {
    normalizedName: norm,
    isPii: false,
    confidence: "LOW",
    piiCategory: "None",
    dpdpCategory: "Non-personal / Non-sensitive",
    isSpecialCategory: false,
    regulation: "—",
    reason: "No PII pattern matched for this column name",
  };
}

// ── POST /api/pii-scanner ─────────────────────────────────────────────────────

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const parsed = ScanSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { input, sampleValues = {} } = parsed.data;
    const columns = parseColumns(input);

    if (columns.length === 0) {
      return badRequest(
        "Could not parse any columns from the input. Provide SQL CREATE TABLE, CSV headers, JSON keys, or newline-separated column names."
      );
    }

    const results: PiiDetectionResult[] = columns.map((col) => ({
      columnName: col,
      ...detectPii(col, sampleValues[col] ?? sampleValues[normalize(col)]),
    }));

    const piiCount = results.filter((r) => r.isPii).length;
    const specialCount = results.filter((r) => r.isSpecialCategory).length;
    const highConfCount = results.filter((r) => r.isPii && r.confidence === "HIGH").length;

    return ok({
      results,
      summary: {
        totalColumns: columns.length,
        piiColumns: piiCount,
        specialCategoryColumns: specialCount,
        highConfidenceMatches: highConfCount,
        hasSensitiveData: piiCount > 0,
        dpdpObligations:
          piiCount > 0
            ? [
                "Obtain valid consent before processing (DPDP Sec. 6)",
                "Implement purpose limitation (DPDP Sec. 7)",
                "Respond to data principal rights requests (DPDP Sec. 11–13)",
                specialCount > 0
                  ? "Sensitive personal data requires explicit, specific consent (DPDP Sec. 8)"
                  : null,
              ].filter(Boolean)
            : [],
      },
    });
  } catch (err) {
    return serverError(err);
  }
});
