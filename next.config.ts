import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon; exceljs ships its own bundled deps.
  serverExternalPackages: ['better-sqlite3', 'exceljs'],
  eslint: { ignoreDuringBuilds: false },
  experimental: {
    // Spreadsheet uploads and the reviewed-rows payload both travel through
    // server actions, so the 1 MB default is too tight.
    serverActions: { bodySizeLimit: '8mb' },
  },
};

export default nextConfig;
