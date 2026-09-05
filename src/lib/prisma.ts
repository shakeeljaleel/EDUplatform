import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In development, always create a fresh client to avoid stale cached instances
// after Prisma schema changes (new models would be undefined otherwise)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
  console.log('Prisma Models Available:', models.join(', '))
  if (typeof (prisma as any).examSession === 'undefined') {
    console.error('CRITICAL: Prisma ExamSession model is missing from current client instance!')
  }
}
