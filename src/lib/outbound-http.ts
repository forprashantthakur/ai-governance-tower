/**
 * Server-side HTTP POST to user-configured URLs (project webhooks).
 *
 * Guards against the server being used to reach internal services:
 *  - https only, no credentials in the URL;
 *  - every address the hostname resolves to is checked at connect time
 *    (so DNS rebinding between "check" and "use" doesn't help), and
 *    loopback, private, link-local, CGNAT, multicast and reserved ranges
 *    (IPv4 and IPv6, incl. IPv4-mapped) are refused;
 *  - redirects are not followed;
 *  - response bodies are capped and only a short snippet is kept.
 */
import https from "https";
import net from "net";
import dns from "dns";

export class UnsafeUrlError extends Error {}

const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of [
  ["::", 96], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64],
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10],
  ["fec0::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(addr, prefix, "ipv6");

export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blocked.check(mapped[1], "ipv4");
    if (/^::ffff:/i.test(address)) return true; // hex-form mapped addresses
    return blocked.check(address, "ipv6");
  }
  return true; // not an IP at all
}

/** Parse and check the URL shape (scheme, credentials, literal IPs). */
export function parseOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }
  if (url.protocol !== "https:") throw new UnsafeUrlError("Only https:// URLs are allowed");
  if (url.username || url.password) throw new UnsafeUrlError("URLs must not contain credentials");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host.toLowerCase() === "localhost" || host.toLowerCase().endsWith(".localhost") || host.toLowerCase().endsWith(".internal"))
    throw new UnsafeUrlError("URL points to a private address");
  if (net.isIP(host) && isBlockedAddress(host)) throw new UnsafeUrlError("URL points to a private address");
  return url;
}

/** Resolve the hostname now and refuse private targets (for early feedback at save time). */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const url = parseOutboundUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return url;
  let addrs: { address: string }[];
  try {
    addrs = await dns.promises.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("Hostname could not be resolved");
  }
  if (addrs.length === 0 || addrs.some((a) => isBlockedAddress(a.address)))
    throw new UnsafeUrlError("URL points to a private address");
  return url;
}

// dns.lookup wrapper used by the socket itself, so the address actually
// connected to is the one that was checked.
const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = (addresses as unknown as dns.LookupAddress[]) ?? [];
    const safe = list.find((a) => !isBlockedAddress(a.address));
    if (!safe || list.some((a) => isBlockedAddress(a.address))) {
      return callback(new UnsafeUrlError("URL points to a private address") as NodeJS.ErrnoException, "", 0);
    }
    if ((options as dns.LookupOptions)?.all) {
      return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, [safe]);
    }
    return callback(null, safe.address, safe.family);
  });
};

export interface OutboundResult {
  ok: boolean;
  status: number | null;
  /** First few hundred characters of the response, or the error message. */
  snippet: string;
}

export async function safePostJson(
  rawUrl: string,
  payload: unknown,
  { timeoutMs = 10_000, maxBytes = 64 * 1024, snippetChars = 300 } = {}
): Promise<OutboundResult> {
  let url: URL;
  try {
    url = parseOutboundUrl(rawUrl);
  } catch (err) {
    return { ok: false, status: null, snippet: (err as Error).message };
  }
  const body = JSON.stringify(payload);

  return new Promise<OutboundResult>((resolveOnce) => {
    // `timeout` below is an idle timeout; this is the overall deadline.
    let settled = false;
    const resolve = (r: OutboundResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolveOnce(r);
    };
    const deadline = setTimeout(() => {
      req.destroy(new Error("Request timed out"));
    }, timeoutMs);
    const req = https.request(
      url,
      {
        method: "POST",
        lookup: guardedLookup,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size <= maxBytes) chunks.push(c);
          else res.destroy();
        });
        const done = () => {
          const status = res.statusCode ?? null;
          const text = Buffer.concat(chunks).toString("utf8").slice(0, snippetChars);
          resolve({ ok: status !== null && status >= 200 && status < 300, status, snippet: text });
        };
        res.on("end", done);
        res.on("close", done);
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", (err) =>
      resolve({
        ok: false,
        status: null,
        snippet: err instanceof UnsafeUrlError ? err.message : "Request failed",
      })
    );
    req.end(body);
  });
}
