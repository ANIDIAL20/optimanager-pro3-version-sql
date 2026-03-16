import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  // 🚀 CRITICAL FIX: Increase body size limit for invoice image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Default is 1MB - images are typically 3-5MB
      allowedOrigins: [
        "localhost:3000",
        "*.vercel.app", 
      ],
    },
  },
  serverExternalPackages: ['ws'],

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  productionBrowserSourceMaps: false,

};

export default nextConfig;
