/**
 * Moves evidence files and project artifacts uploaded before private storage
 * into the private Blob store, then deletes the public copies.
 *
 * Needs DATABASE_URL, BLOB_READ_WRITE_TOKEN (old public store) and
 * PRIVATE_BLOB_READ_WRITE_TOKEN (new private store).
 *
 *   npm run files:migrate-private            # dry run: lists what would move
 *   npm run files:migrate-private -- --apply # moves the files
 */
import { PrismaClient } from "@prisma/client";
import { get, put, del } from "@vercel/blob";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const PRIVATE = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;

const isPrivate = (url: string) => {
  try {
    return new URL(url).hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
};

async function moveToPrivate(url: string, contentType: string): Promise<string> {
  const src = await get(url, { access: "public" });
  if (!src || src.statusCode !== 200 || !src.stream) throw new Error(`could not read ${url}`);
  const pathname = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  const dest = await put(pathname, src.stream, {
    access: "private",
    contentType,
    addRandomSuffix: true,
    token: PRIVATE,
  });
  return dest.url;
}

async function main() {
  if (APPLY && !PRIVATE) throw new Error("Set PRIVATE_BLOB_READ_WRITE_TOKEN first");

  const evidence = (await prisma.evidenceFile.findMany({ select: { id: true, url: true, mimeType: true } }))
    .filter((f) => !isPrivate(f.url));
  const artifacts = (await prisma.projectArtifact.findMany({ select: { id: true, url: true, mimeType: true } }))
    .filter((f) => !isPrivate(f.url));
  console.log(`${evidence.length} evidence file(s) and ${artifacts.length} artifact(s) are still in public storage.`);
  if (!APPLY) {
    console.log("Dry run. Re-run with --apply to move them.");
    return;
  }

  let moved = 0;
  let failed = 0;
  for (const [kind, rows] of [["evidence", evidence], ["artifact", artifacts]] as const) {
    for (const row of rows) {
      try {
        const newUrl = await moveToPrivate(row.url, row.mimeType || "application/octet-stream");
        if (kind === "evidence") await prisma.evidenceFile.update({ where: { id: row.id }, data: { url: newUrl } });
        else await prisma.projectArtifact.update({ where: { id: row.id }, data: { url: newUrl } });
        await del(row.url); // remove the public copy only after the record points at the private one
        moved++;
      } catch (err) {
        failed++;
        console.error(`  ${kind} ${row.id}: ${(err as Error).message}`);
      }
    }
  }
  console.log(`Moved ${moved}; ${failed} failed (left in place, safe to re-run).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
