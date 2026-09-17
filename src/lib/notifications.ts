import { prisma } from './prisma'

export async function notifySubjectMembers(
  subjectId: string,
  classSessionId: string | null,
  type: string,
  title: string,
  message: string
) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { subjectId, status: 'active' },
    include: {
      student: {
        include: { profile: { include: { parent: { include: { user: true } } } } }
      }
    }
  })

  const notifications: any[] = []
  for (const e of enrollments) {
    // Notify student
    notifications.push({ userId: e.studentId, type, title, message, classSessionId })
    // Notify linked parent
    const parentUser = e.student.profile?.parent?.user
    if (parentUser) {
      notifications.push({ userId: parentUser.id, type, title, message, classSessionId })
    }
  }
  
  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

export async function notifyBatchMembers(
  batchId: string,
  type: string,
  title: string,
  message: string
) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { batchId, status: 'active' }
  })

  const notifications = enrollments.map(e => ({
    userId: e.studentId,
    type,
    title,
    message
  }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  message: string
) {
  await prisma.notification.create({
    data: { userId, type, title, message }
  })
}
