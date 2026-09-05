import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const batchId = '3e1ee5cf-1dd6-404f-a1a0-4c71dbd5b7b6'
  const subjectId = '8a80c886-b557-4b5a-825b-2dcb347f1127'
  
  const studentData = [
    { name: 'Sarah Miller', email: 'sarah@test.com' },
    { name: 'James Wilson', email: 'james@test.com' },
    { name: 'Elena Gilbert', email: 'elena@test.com' },
    { name: 'Test Student', email: 'student1@test.com' },
    { name: 'Ahmed Khan', email: 'student2@test.com' }
  ]

  console.log('Starting enrollment...')

  for (const data of studentData) {
    // Create or find student
    const student = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        name: data.name,
        email: data.email,
        passwordHash: 'dummy_hash', 
        role: 'STUDENT',
        approvalStatus: 'APPROVED'
      }
    })

    // Enroll in Batch
    await prisma.batchEnrollment.upsert({
      where: {
        userId_batchId: {
          userId: student.id,
          batchId: batchId
        }
      },
      update: {},
      create: {
        userId: student.id,
        batchId: batchId,
        role: 'STUDENT'
      }
    })

    // Enroll in Subject
    await prisma.subjectEnrollment.upsert({
      where: {
        subjectId_userId: {
          userId: student.id,
          subjectId: subjectId
        }
      },
      update: { status: 'ACTIVE' },
      create: {
        userId: student.id,
        subjectId: subjectId,
        status: 'ACTIVE'
      }
    })

    console.log(`Enrolled ${data.name} (${data.email})`)
  }

  console.log('Enrollment complete.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
