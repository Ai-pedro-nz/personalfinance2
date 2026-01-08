/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure external packages for server-side rendering
  serverExternalPackages: ['@prisma/client'],
  // Allow external hosts for Codespaces
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig