/**
 * Static guards over every API route, so a new route can't quietly skip
 * authentication or tenant scoping. These run in CI on every push.
 *
 * 1. Every exported handler (GET/POST/…) is wrapped in withAuth, unless the
 *    route is on the PUBLIC_ROUTES list below.
 * 2. Every authenticated handler in a route with a dynamic segment ([id] etc.)
 *    must use the caller's organizationId (or a tenant helper such as
 *    findProjectInOrg) somewhere in its body. A handler that loads records by
 *    id without ever referring to the organization fails this test.
 *
 * If one of these fails for a new route, fix the route. Only add to an
 * allow-list after checking by hand that the handler can't expose another
 * organization's data, and say why next to the entry.
 */
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const API_ROOT = path.join(__dirname, "../../app/api");
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

/** Routes that must work without a session. */
const PUBLIC_ROUTES: Record<string, string> = {
  "auth/check-email/route.ts": "sign-up form; rate-limited",
  "auth/forgot-password/route.ts": "password reset request; rate-limited",
  "auth/invite-info/route.ts": "invite landing page; needs the invite token; rate-limited",
  "auth/login/route.ts": "sign-in; rate-limited",
  "auth/logout/route.ts": "only clears the caller's own cookie",
  "auth/me/route.ts": "authenticates with authenticateRequest() itself",
  "auth/register/route.ts": "sign-up and invite acceptance; rate-limited",
  "auth/reset-password/route.ts": "needs a valid reset token; rate-limited",
  "auth/verify-email/route.ts": "needs a valid verification token; rate-limited",
  "health/route.ts": "returns no data",
};

/** Dynamic-segment handlers that legitimately don't filter by organizationId. */
const NO_ORG_SCOPE_NEEDED: Record<string, string> = {};

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return routeFiles(full);
    return e.name === "route.ts" ? [full] : [];
  });
}

interface Handler {
  method: string;
  init: ts.Expression | undefined;
  file: ts.SourceFile;
}

/** `export { handler as GET }` hides whether the handler is wrapped; routes must use `export const GET = withAuth(...)`. */
function reExportedMethods(file: ts.SourceFile): string[] {
  const out: string[] = [];
  for (const stmt of file.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) if (HTTP_METHODS.has(el.name.text)) out.push(el.name.text);
    }
  }
  return out;
}

/** Source text of a handler body without audit-log calls (which mention organizationId but scope nothing). */
function bodyTextWithoutAuditCalls(body: ts.Node, src: ts.SourceFile): string {
  const skip: Array<[number, number]> = [];
  (function visit(n: ts.Node) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "logAudit") {
      skip.push([n.getStart(src), n.getEnd()]);
      return;
    }
    ts.forEachChild(n, visit);
  })(body);
  let text = body.getText(src);
  const base = body.getStart(src);
  for (const [a, b] of skip.sort((x, y) => y[0] - x[0])) text = text.slice(0, a - base) + text.slice(b - base);
  return text;
}

function exportedHandlers(file: ts.SourceFile): Handler[] {
  const out: Handler[] = [];
  for (const stmt of file.statements) {
    const exported = ts.getModifiers(stmt as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(stmt) && stmt.name && HTTP_METHODS.has(stmt.name.text)) {
      out.push({ method: stmt.name.text, init: undefined, file });
    }
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && HTTP_METHODS.has(d.name.text)) {
          out.push({ method: d.name.text, init: d.initializer, file });
        }
      }
    }
  }
  return out;
}

/** The handler function passed to withAuth(...), or null if not wrapped. */
function withAuthInner(init: ts.Expression | undefined): ts.FunctionLikeDeclaration | null {
  if (!init || !ts.isCallExpression(init)) return null;
  if (!ts.isIdentifier(init.expression) || init.expression.text !== "withAuth") return null;
  const fn = init.arguments[0];
  if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return fn;
  return null;
}

const files = routeFiles(API_ROOT).map((f) => ({
  rel: path.relative(API_ROOT, f).split(path.sep).join("/"),
  src: ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true),
}));

describe("API route guards", () => {
  it("finds the API routes", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("every handler requires a session unless the route is listed as public", () => {
    const unguarded: string[] = [];
    for (const { rel, src } of files) {
      if (PUBLIC_ROUTES[rel]) continue;
      for (const h of exportedHandlers(src)) {
        if (!withAuthInner(h.init)) unguarded.push(`${h.method} ${rel}`);
      }
      for (const m of reExportedMethods(src)) unguarded.push(`${m} ${rel} (re-exported; use export const ${m} = withAuth(...))`);
    }
    expect(unguarded).toEqual([]);
  });

  it("every handler in a route with a dynamic segment scopes by the caller's organization", () => {
    const unscoped: string[] = [];
    for (const { rel, src } of files) {
      if (!rel.includes("[") || PUBLIC_ROUTES[rel]) continue;
      for (const h of exportedHandlers(src)) {
        const fn = withAuthInner(h.init);
        if (!fn || !fn.body) continue;
        const key = `${h.method} ${rel}`;
        if (NO_ORG_SCOPE_NEEDED[key]) continue;
        const body = bodyTextWithoutAuditCalls(fn.body, src);
        if (!/\borganizationId\b|InOrg\(|inOrg\(/.test(body)) unscoped.push(key);
      }
    }
    expect(unscoped).toEqual([]);
  });

  it("public-route list has no stale entries", () => {
    const existing = new Set(files.map((f) => f.rel));
    expect(Object.keys(PUBLIC_ROUTES).filter((r) => !existing.has(r))).toEqual([]);
  });
});
