/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk', 'mammoth'],
  // Body size for /api/* is controlled per-route via App Router route segment
  // config (see src/app/api/analyze/route.ts) plus the Content-Length guard in
  // src/lib/requestGuards.ts.
}

module.exports = nextConfig
