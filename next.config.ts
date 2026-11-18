import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

const isDev = process.env.NODE_ENV !== "production";

// Turbopack/webpack HMR needs 'unsafe-eval' + a ws:// connection in dev only.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
  : "script-src 'self' 'unsafe-inline' https://js.stripe.com";
const connectSrc = isDev
  ? `connect-src 'self' ws://localhost:* https://${supabaseHost} https://api.stripe.com`
  : `connect-src 'self' https://${supabaseHost} https://api.stripe.com`;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: https://${supabaseHost}`,
      connectSrc,
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    // Product photos are uploaded once under a new file name and never overwritten, so the
    // optimized copies can be kept for a month instead of the 4-hour default.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // "/" has to land on a locale. Doing it here (before the proxy runs) serves the redirect
  // from the edge with no code executed; the language proxy only runs for the pages that
  // really need it. A visitor who already chose English keeps it through the NEXT_LOCALE
  // cookie that next-intl sets.
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "cookie", key: "NEXT_LOCALE", value: "en" }],
        destination: "/en",
        permanent: false,
      },
      { source: "/", destination: "/es", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
