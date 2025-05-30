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
};

module.exports = nextConfig;
