#!/usr/bin/env node
/**
 * One-off: replace the incomplete migration history with a single baseline
 * migration generated from prisma/schema.prisma.
 *
 * Why: the build used to run `prisma db push`, so the committed migrations
 * only create 24 of the 55 tables and `prisma migrate deploy` would build a
 * broken database. After this baseline, schema changes ship as reviewed
 * migration files and are applied with `npm run db:deploy` as a separate
 * release step, never inside the build.
 *
 * Run from the repo root (needs no database):   npm run db:baseline
 * Then, ONCE, against the existing production database (its tables already
 * exist, so the baseline is only recorded as applied, not executed):
 *   DATABASE_URL="<production url>" npx prisma migrate resolve --applied 0_baseline
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const migrations = path.join(root, "prisma", "migrations");
const archive = path.join(root, "prisma", "migrations-archive");
const baselineDir = path.join(migrations, "0_baseline");

if (fs.existsSync(baselineDir)) {
  console.log("prisma/migrations/0_baseline already exists — nothing to do.");
  process.exit(0);
}

fs.mkdirSync(archive, { recursive: true });
for (const entry of fs.readdirSync(migrations, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    fs.renameSync(path.join(migrations, entry.name), path.join(archive, entry.name));
    console.log(`archived prisma/migrations/${entry.name} -> prisma/migrations-archive/`);
  }
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const sql = execFileSync(
  npx,
  ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
  { cwd: root, encoding: "utf8", shell: process.platform === "win32" }
);
fs.mkdirSync(baselineDir, { recursive: true });
fs.writeFileSync(path.join(baselineDir, "migration.sql"), sql);
console.log(`\nWrote prisma/migrations/0_baseline/migration.sql (${sql.length} bytes).`);
console.log(`
Next steps:
  1. Commit prisma/migrations and prisma/migrations-archive.
  2. Once, against production (records the baseline without running it):
       DATABASE_URL="<production url>" npx prisma migrate resolve --applied 0_baseline
  3. From now on: create migrations with \`npm run db:migrate\` locally, review them
     in the pull request, and apply them with \`npm run db:deploy\` before deploying.`);
