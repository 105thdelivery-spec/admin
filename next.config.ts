import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Cloud Run deployment
  output: 'standalone',

  // Configure external packages for server components
  serverExternalPackages: [],
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  images: {
    remotePatterns: [
      // Google Cloud Storage
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      // Keep Vercel Blob for backward compatibility with existing images
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '7wrvwal0c4f2v4r6.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      // Additional hostname patterns for latest Vercel Blob
      {
        protocol: 'https',
        hostname: 'blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  webpack: (config, { isServer }) => {
    // Handle node: scheme imports for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        events: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
