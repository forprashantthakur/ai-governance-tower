/** @type {import('next').NextConfig} */

// Applied to every response (pages and API).
// - frame-ancestors / X-Frame-Options stop other sites framing the app
//   (clickjacking); same-origin framing is kept for the landing page's demos.
// - A full script-src CSP needs nonces in Next 14 and testing in a browser,
//   so it is left as a follow-up rather than shipped untested.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
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
        headers: [
          { key: "Cache-Control", value: "no-store" },
          // API responses are never search results.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  // One canonical host: www.aigovernancetower.com currently serves a duplicate
  // copy of the site, which splits search ranking between two hosts.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.aigovernancetower.com" }],
        destination: "https://aigovernancetower.com/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
