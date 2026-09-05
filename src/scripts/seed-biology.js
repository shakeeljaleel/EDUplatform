const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const biologyId = '8a80c886-b557-4b5a-825b-2dcb347f1127'
  const msSmithId = 'e154fdaf-5e58-4a8d-85ae-2c5ef0045fa8'

  console.log('Seeding updates for Ms. Smith class...')

  // 1. Add Syllabus Objectives
  const objectives = [
    { code: 'BIO-1.1', description: 'Cell structure and organelles', subjectId: biologyId, curriculum: 'Standard' },
    { code: 'BIO-1.2', description: 'Membrane transport mechanisms', subjectId: biologyId, curriculum: 'Standard' },
    { code: 'BIO-2.1', description: 'Photosynthesis basics', subjectId: biologyId, curriculum: 'Standard' }
  ]

  for (const obj of objectives) {
    await prisma.syllabusObjective.upsert({
      where: { code: obj.code },
      update: {},
      create: obj
    })
  }

  // 2. Add an Upcoming Class
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const session = await prisma.classSession.create({
    data: {
      subjectId: biologyId,
      title: 'Advanced Mitochondrial Research',
      description: 'Deep dive into ATP synthesis and mitochondrial DNA.',
      scheduledDate: tomorrow,
      durationMins: 90,
      status: 'SCHEDULED'
    }
  })

  // Link objective to session
  const objective = await prisma.syllabusObjective.findUnique({ where: { code: 'BIO-1.1' } })
  if (objective) {
    await prisma.classSession.update({
      where: { id: session.id },
      data: {
        syllabusObjectives: {
          connect: { id: objective.id }
        }
      }
    })
  }

  // 3. Add a Resource
  await prisma.classResource.create({
    data: {
      sessionId: session.id,
      title: 'Mitochondria Diagram PDF',
      url: 'https://example.com/mitochondria.pdf',
      type: 'PDF',
      isPreWatch: true
    }
  })

  console.log('Seeding complete!')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
