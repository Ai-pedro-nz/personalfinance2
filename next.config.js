/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure for Codespaces
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
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