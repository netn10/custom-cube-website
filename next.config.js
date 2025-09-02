/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure TypeScript compilation
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Configure ESLint
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Configure allowed image domains
  images: {
    domains: ['i.imgur.com', 'imgur.com', 'gatherer.wizards.com', 'cards.scryfall.io', 'c1.scryfall.com'],
  },
  // Enable server components
  experimental: {
    serverActions: true,
  },
  // Configure reverse proxy for API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://netn10-custom-cube-backend-31fb1edb5cb3.herokuapp.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
