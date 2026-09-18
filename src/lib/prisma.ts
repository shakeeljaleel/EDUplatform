import { PrismaClient } from '@prisma/client'

// Auto-alias Vercel Postgres / Neon environment variables to DATABASE_URL if missing
const dbUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_UNPOOLED ||
  process.env.VERCEL_POSTGRES_URL

if (!process.env.DATABASE_URL && dbUrl) {
  process.env.DATABASE_URL = dbUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

