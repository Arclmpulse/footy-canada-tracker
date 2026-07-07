import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-cron', 'cheerio', 'axios'],
};

export default nextConfig;
