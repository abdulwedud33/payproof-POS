/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@payproof/ui-tokens', '@payproof/money', '@payproof/shared-types'],
};

module.exports = nextConfig;
