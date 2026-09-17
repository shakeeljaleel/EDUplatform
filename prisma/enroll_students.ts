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

    // Get a branch for enrollment
    const branch = await prisma.branch.findFirst()
    if (!branch) throw new Error('No branch found')

    // Create student enrollment
    await prisma.studentEnrollment.upsert({
      where: {
        id: `enroll-${student.id}-${subjectId}`
      },
      update: { status: 'active' },
      create: {
        id: `enroll-${student.id}-${subjectId}`,
        studentId: student.id,
        batchId: batchId,
        branchId: branch.id,
        subjectId: subjectId,
        status: 'active'
      }
    })

    console.log(`Enrolled ${data.name} (${data.email})`)
  }

  console.log('Enrollment complete.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
