/**
 * Stand-in for the generated `@prisma/client` module so route files that
 * import enums at runtime (e.g. `z.nativeEnum(OrgMemberRole)`) can load in
 * tests without a generated client. Enum values are read from schema.prisma.
 */
import { readFileSync } from "fs";
import { join } from "path";

const schema = readFileSync(join(__dirname, "../../../prisma/schema.prisma"), "utf8");
const enums: Record<string, Record<string, string>> = {};
for (const m of schema.matchAll(/^enum\s+(\w+)\s*\{([^}]*)\}/gm)) {
  const values = m[2]
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, "").trim().split(/\s+/)[0])
    .filter((v) => v && /^\w+$/.test(v));
  enums[m[1]] = Object.fromEntries(values.map((v) => [v, v]));
}

module.exports = {
  ...enums,
  Prisma: { PrismaClientKnownRequestError: class extends Error {}, JsonNull: null, DbNull: null },
  PrismaClient: class {},
};
