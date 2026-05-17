import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable static export
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'adnanpay.com',
      },
    ],
  },
  
  // Base path for assets (if needed)
  // basePath: '',
  
  // Trailing slash for static hosting
  trailingSlash: true,
};

export default nextConfig;
