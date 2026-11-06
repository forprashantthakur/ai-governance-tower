/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal in-memory stand-in for the Prisma client, used by the security
 * regression tests. It supports the query shapes the route handlers use
 * (where-filters incl. relation filters, include of to-one / to-many
 * relations, create/update/delete and their *Many variants) closely enough
 * to show what a handler actually reads or writes for a given caller.
 *
 * It is deliberately strict where Prisma is strict: update()/delete() throw
 * a P2025-style error when nothing matches, findUnique() returns null, etc.
 */
import { randomUUID } from "crypto";

type Row = Record<string, any>;
type RelationDef = { model: string; fk: string; many?: false } | { model: string; fk: string; many: true };
export type Relations = Record<string, Record<string, RelationDef>>;

class NotFoundError extends Error {
  code = "P2025";
  constructor(model: string) {
    super(`An operation failed because it depends on one or more records that were required but not found. (${model})`);
  }
}

export function createFakePrisma(relations: Relations = {}, defaults: Record<string, Row> = {}) {
  const tables: Record<string, Row[]> = {};
  const calls: { model: string; op: string; args: any }[] = [];
  const table = (m: string) => (tables[m] ??= []);

  const isPlainObject = (v: any) =>
    v !== null && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v);

  function related(model: string, row: Row, key: string): Row | Row[] | undefined {
    const rel = relations[model]?.[key];
    if (!rel) return undefined;
    if (rel.many) return table(rel.model).filter((r) => r[rel.fk] === row.id);
    return table(rel.model).find((r) => r.id === row[rel.fk]);
  }

  function matchScalar(actual: any, cond: any): boolean {
    if (!isPlainObject(cond)) {
      if (actual instanceof Date && cond instanceof Date) return actual.getTime() === cond.getTime();
      return actual === cond;
    }
    for (const [op, v] of Object.entries(cond)) {
      switch (op) {
        case "equals": if (actual !== v) return false; break;
        case "not": if (isPlainObject(v) ? matchScalar(actual, v) : actual === v) return false; break;
        case "in": if (!(v as any[]).includes(actual)) return false; break;
        case "notIn": if ((v as any[]).includes(actual)) return false; break;
        case "contains": if (typeof actual !== "string" || !actual.includes(v as string)) return false; break;
        case "startsWith": if (typeof actual !== "string" || !actual.startsWith(v as string)) return false; break;
        case "gt": if (!(actual > (v as any))) return false; break;
        case "gte": if (!(actual >= (v as any))) return false; break;
        case "lt": if (!(actual < (v as any))) return false; break;
        case "lte": if (!(actual <= (v as any))) return false; break;
        case "mode": break;
        case "has": if (!Array.isArray(actual) || !actual.includes(v)) return false; break;
        default: return false;
      }
    }
    return true;
  }

  function matches(model: string, row: Row, where: any): boolean {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === "AND") { if (!(cond as any[]).every((w) => matches(model, row, w))) return false; continue; }
      if (key === "OR") { if (!(cond as any[]).some((w) => matches(model, row, w))) return false; continue; }
      if (key === "NOT") { if (matches(model, row, cond)) return false; continue; }
      const rel = relations[model]?.[key];
      if (rel) {
        const r = related(model, row, key);
        if (rel.many) {
          const list = (r as Row[]) ?? [];
          const c = cond as any;
          if (c.some && !list.some((x) => matches(rel.model, x, c.some))) return false;
          if (c.every && !list.every((x) => matches(rel.model, x, c.every))) return false;
          if (c.none && list.some((x) => matches(rel.model, x, c.none))) return false;
          continue;
        }
        if (cond === null) { if (r) return false; continue; }
        const c = cond as any;
        const inner = c.is !== undefined ? c.is : c;
        if (!r || !matches(rel.model, r as Row, inner)) return false;
        continue;
      }
      // compound unique key, e.g. { organizationId_userId: { organizationId, userId } }
      if (key.includes("_") && isPlainObject(cond) && !(key in row)) {
        if (!matches(model, row, cond)) return false;
        continue;
      }
      if (!matchScalar(row[key], cond)) return false;
    }
    return true;
  }

  function shape(model: string, row: Row | undefined | null, args: any): any {
    if (!row) return row ?? null;
    const out: Row = { ...row };
    const inc = args?.include ?? {};
    const sel = args?.select;
    for (const [k, v] of Object.entries({ ...inc, ...(sel ?? {}) })) {
      const rel = relations[model]?.[k];
      if (!rel || !v) continue;
      const r = related(model, row, k);
      const sub = typeof v === "object" ? v : undefined;
      if (rel.many) {
        let list = (r as Row[]).filter((x) => matches(rel.model, x, (sub as any)?.where));
        if ((sub as any)?.take) list = list.slice(0, (sub as any).take);
        out[k] = list.map((x) => shape(rel.model, x, sub));
      } else out[k] = shape(rel.model, r as Row, sub);
    }
    const cnt = inc._count ?? sel?._count;
    if (cnt) {
      out._count = {};
      for (const k of Object.keys(cnt.select ?? {})) {
        const r = related(model, row, k);
        out._count[k] = Array.isArray(r) ? r.length : 0;
      }
    }
    if (sel) {
      const picked: Row = {};
      for (const k of Object.keys(sel)) if (sel[k]) picked[k] = out[k];
      return picked;
    }
    return out;
  }

  function applyData(row: Row, data: Row) {
    for (const [k, v] of Object.entries(data ?? {})) {
      if (v === undefined) continue;
      if (isPlainObject(v) && ("increment" in v || "decrement" in v || "set" in v)) {
        const o = v as any;
        if ("set" in o) row[k] = o.set;
        if ("increment" in o) row[k] = (row[k] ?? 0) + o.increment;
        if ("decrement" in o) row[k] = (row[k] ?? 0) - o.decrement;
        continue;
      }
      if (isPlainObject(v) && ("connect" in v || "create" in v || "createMany" in v || "deleteMany" in v)) continue;
      row[k] = v;
    }
    row.updatedAt = new Date();
  }

  function modelApi(model: string) {
    const log = (op: string, args: any) => calls.push({ model, op, args });
    return {
      async findUnique(args: any) { log("findUnique", args); return shape(model, table(model).find((r) => matches(model, r, args?.where)), args); },
      async findUniqueOrThrow(args: any) { log("findUniqueOrThrow", args); const r = table(model).find((x) => matches(model, x, args?.where)); if (!r) throw new NotFoundError(model); return shape(model, r, args); },
      async findFirst(args: any) { log("findFirst", args); return shape(model, table(model).find((r) => matches(model, r, args?.where)), args); },
      async findMany(args: any) {
        log("findMany", args);
        let rows = table(model).filter((r) => matches(model, r, args?.where));
        if (args?.skip) rows = rows.slice(args.skip);
        if (args?.take) rows = rows.slice(0, args.take);
        return rows.map((r) => shape(model, r, args));
      },
      async count(args: any) { log("count", args); return table(model).filter((r) => matches(model, r, args?.where)).length; },
      async aggregate(args: any) { log("aggregate", args); return { _count: table(model).filter((r) => matches(model, r, args?.where)).length, _avg: {}, _sum: {}, _max: {}, _min: {} }; },
      async groupBy(args: any) { log("groupBy", args); return []; },
      async create(args: any) {
        log("create", args);
        const row: Row = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...(defaults[model] ?? {}) };
        applyData(row, args.data);
        table(model).push(row);
        return shape(model, row, args);
      },
      async createMany(args: any) { log("createMany", args); for (const d of args.data) { const row: Row = { id: randomUUID(), createdAt: new Date(), ...(defaults[model] ?? {}) }; applyData(row, d); table(model).push(row); } return { count: args.data.length }; },
      async update(args: any) {
        log("update", args);
        const row = table(model).find((r) => matches(model, r, args.where));
        if (!row) throw new NotFoundError(model);
        applyData(row, args.data);
        return shape(model, row, args);
      },
      async updateMany(args: any) { log("updateMany", args); const rows = table(model).filter((r) => matches(model, r, args.where)); rows.forEach((r) => applyData(r, args.data)); return { count: rows.length }; },
      async upsert(args: any) {
        log("upsert", args);
        const row = table(model).find((r) => matches(model, r, args.where));
        if (row) { applyData(row, args.update); return shape(model, row, args); }
        const n: Row = { id: randomUUID(), createdAt: new Date(), ...(defaults[model] ?? {}) }; applyData(n, args.create); table(model).push(n); return shape(model, n, args);
      },
      async delete(args: any) {
        log("delete", args);
        const t = table(model);
        const i = t.findIndex((r) => matches(model, r, args.where));
        if (i < 0) throw new NotFoundError(model);
        return t.splice(i, 1)[0];
      },
      async deleteMany(args: any) { log("deleteMany", args); const t = table(model); const keep = t.filter((r) => !matches(model, r, args?.where)); const n = t.length - keep.length; tables[model] = keep; return { count: n }; },
    };
  }

  const apis: Record<string, any> = {};
  const client: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "$transaction") {
          return async (arg: any) => (typeof arg === "function" ? arg(client) : Promise.all(arg));
        }
        if (prop === "$executeRaw" || prop === "$queryRaw" || prop === "$executeRawUnsafe" || prop === "$queryRawUnsafe") {
          return async (...a: any[]) => { calls.push({ model: "$raw", op: prop, args: a }); return []; };
        }
        if (prop === "$connect" || prop === "$disconnect") return async () => undefined;
        if (prop === "then") return undefined;
        return (apis[prop] ??= modelApi(prop));
      },
    }
  );

  return {
    prisma: client,
    tables,
    calls,
    seed(model: string, rows: Row[]) { table(model).push(...rows.map((r) => ({ createdAt: new Date(), updatedAt: new Date(), ...r }))); },
    reset() { for (const k of Object.keys(tables)) delete tables[k]; calls.length = 0; },
  };
}
