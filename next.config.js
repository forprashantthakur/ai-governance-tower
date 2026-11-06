/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy for every response (pages and API).
// - Scripts, frames and network calls may only go to this site and the few
//   services the pages use (Razorpay checkout, Formspree, Google Fonts), so an
//   injected <script src> or a data-exfiltration request to another host is
//   blocked. No 'unsafe-eval' in production.
// - 'unsafe-inline' stays for scripts because Next.js 14 App Router pages and
//   the static demo pages in public/ use inline scripts; removing it needs
//   per-request nonces (follow-up).
// - frame-ancestors / X-Frame-Options stop other sites framing the app
//   (clickjacking); same-origin framing is kept for the landing page's demos.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https://formspree.io https://*.razorpay.com${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self' https://*.razorpay.com",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    // Enables src/instrumentation.ts (refuses to start without JWT_SECRET).
    instrumentationHook: true,
  },
  images: {
    // next/image is not used; turning the optimizer off removes its attack
    // surface (several Next.js advisories target the image optimizer).
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

module.exports = nextConfig;
