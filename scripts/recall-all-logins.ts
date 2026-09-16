import { prisma } from '../src/lib/prisma'

async function recallAllLogins() {
  console.log('Recalling all active logins and invalidating session tokens for all accounts...')
  try {
    const deletedSessions = await prisma.activeSession.deleteMany({})
    console.log(`Successfully recalled all active logins! Total active sessions purged: ${deletedSessions.count}`)
  } catch (error) {
    console.error('Error recalling active logins:', error)
  } finally {
    await prisma.$disconnect()
  }
}

recallAllLogins()
