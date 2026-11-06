/**
 * Uploaded files (audit evidence, project artifacts).
 *
 * New files go to a PRIVATE Vercel Blob store: their URLs can't be opened
 * without the store's token, so the only way to read a file is through an
 * API route that first checks the caller's organization and role.
 *
 * Configure the private store's read-write token as PRIVATE_BLOB_READ_WRITE_TOKEN.
 * Files uploaded before this change live in the old public store
 * (BLOB_READ_WRITE_TOKEN); they are still served through the same checked
 * routes, and `scripts/migrate-files-to-private.ts` moves them.
 */
import { put, get, del } from "@vercel/blob";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Private file storage is not configured (PRIVATE_BLOB_READ_WRITE_TOKEN)");
    this.name = "StorageNotConfiguredError";
  }
}

function privateToken(): string {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) throw new StorageNotConfiguredError();
  return token;
}

/** True for URLs in a private Blob store (only readable with its token). */
export function isPrivateBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Stores a file privately and returns its storage URL (never send it to browsers). */
export async function storePrivateFile(pathname: string, file: File | Blob, contentType: string): Promise<string> {
  const blob = await put(pathname, file, {
    access: "private",
    contentType,
    addRandomSuffix: true,
    token: privateToken(),
  });
  return blob.url;
}

/** Deletes a stored file from whichever store holds it. */
export async function deleteStoredFile(url: string): Promise<void> {
  if (isPrivateBlobUrl(url)) {
    await del(url, { token: privateToken() });
  } else {
    await del(url);
  }
}

function safeFilename(name: string): string {
  return name.replace(/[\r\n"\\]/g, "_").slice(0, 200) || "file";
}

/**
 * Streams a stored file to an already-authorised caller. Always served as a
 * download (never rendered inline on our origin) and never cached.
 */
export async function streamStoredFile(
  url: string,
  meta: { name: string; mimeType?: string | null }
): Promise<Response> {
  const result = isPrivateBlobUrl(url)
    ? await get(url, { access: "private", token: privateToken() })
    : await get(url, { access: "public" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return new Response(JSON.stringify({ success: false, error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filename = safeFilename(meta.name);
  return new Response(result.stream, {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType || result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

/** Response used when private storage hasn't been set up yet. */
export const STORAGE_NOT_CONFIGURED_MESSAGE =
  "File uploads are turned off until private file storage is configured. Ask an administrator to create a private Vercel Blob store and set PRIVATE_BLOB_READ_WRITE_TOKEN.";

/** A file record as sent to browsers: the storage URL is replaced by our checked download route. */
export function withoutStorageUrl<T extends { url: string }>(record: T, downloadUrl: string): Omit<T, "url"> & { downloadUrl: string } {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { url, ...rest } = record;
  return { ...rest, downloadUrl };
}
