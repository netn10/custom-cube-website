/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable static exports
  output: 'export',
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
    unoptimized: true, // Required for static exports
  },
  // Add base path if needed for GitHub Pages or similar
  // basePath: '/custom-cube-website',
  // assetPrefix: '/custom-cube-website/',
};

module.exports = nextConfig;
