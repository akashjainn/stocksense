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
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['ignore-loader']
      },
      '*.LICENSE': {
        loaders: ['ignore-loader']
      }
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@libsql/client': 'commonjs @libsql/client',
        '@libsql/isomorphic-ws': 'commonjs @libsql/isomorphic-ws',
        '@libsql/isomorphic-fetch': 'commonjs @libsql/isomorphic-fetch',
        '@libsql/hrana-client': 'commonjs @libsql/hrana-client',
        'libsql': 'commonjs libsql'
      });
    }
    
    // Ignore non-JS files in libSQL packages
    config.module.rules.push({
      test: /\.(md|LICENSE)$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    });
    
    return config;
  }
};

export default nextConfig;
