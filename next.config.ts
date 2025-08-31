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
