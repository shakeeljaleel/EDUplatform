import { PrismaClient } from '@prisma/client'

// Auto-alias Vercel Postgres environment variables to DATABASE_URL if missing
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.VERCEL_POSTGRES_URL ||
    ''
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
