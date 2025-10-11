import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/isomorphic-ws', 
    '@libsql/isomorphic-fetch',
    '@libsql/hrana-client',
    '@libsql/win32-x64-msvc',
    'libsql',
    '@prisma/adapter-libsql'
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'self' http://localhost:3000 http://localhost:3001 https://www.akashjain.xyz",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@libsql/client': 'commonjs @libsql/client',
  'libsql': 'commonjs libsql'
      });
    }
    
    return config;
  }
};

export default nextConfig;
