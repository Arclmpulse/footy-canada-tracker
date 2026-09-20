import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-cron', 'cheerio', 'axios'],
  allowedDevOrigins: [
    '192.168.0.117',
    '192.168.0.*',
    'localhost',
    '127.0.0.1',
  ],
};

export default nextConfig;
