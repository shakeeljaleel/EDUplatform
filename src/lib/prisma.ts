import { PrismaClient } from '@prisma/client'

// Prioritize POSTGRES_PRISMA_URL over DATABASE_URL for Vercel / Neon connection pooling
const dbUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_UNPOOLED ||
  process.env.VERCEL_POSTGRES_URL

if (dbUrl) {
  process.env.DATABASE_URL = dbUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.POSTGRES_PRISMA_URL || dbUrl,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

