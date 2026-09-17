const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning duplicate class sessions...')
  const sessions = await prisma.classSession.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const seen = new Set()
  const duplicateIds = []

  for (const s of sessions) {
    const key = `${s.subjectId}_${s.title}_${new Date(s.scheduledDate).toISOString()}`
    if (seen.has(key)) {
      duplicateIds.push(s.id)
    } else {
      seen.add(key)
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`Deleting ${duplicateIds.length} duplicate session(s):`, duplicateIds)
    await prisma.classSession.deleteMany({
      where: { id: { in: duplicateIds } }
    })
    console.log('Duplicate sessions deleted successfully.')
  } else {
    console.log('No duplicate sessions found.')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
