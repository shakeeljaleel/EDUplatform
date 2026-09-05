import type { NextConfig } from "next";

// Auto-alias Vercel Postgres environment variables to DATABASE_URL if missing
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.VERCEL_POSTGRES_URL ||
    "";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
