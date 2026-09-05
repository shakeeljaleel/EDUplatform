import { prisma } from './prisma'

export async function notifySubjectMembers(
  subjectId: string,
  classSessionId: string | null,
  type: string,
  title: string,
  message: string
) {
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId, status: 'APPROVED' },
    include: {
      user: {
        include: { profile: { include: { parent: { include: { user: true } } } } }
      }
    }
  })

  const notifications: any[] = []
  for (const e of enrollments) {
    // Notify student
    notifications.push({ userId: e.userId, type, title, message, classSessionId })
    // Notify linked parent
    const parentUser = e.user.profile?.parent?.user
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
  const enrollments = await prisma.batchEnrollment.findMany({
    where: { batchId, role: 'STUDENT' }
  })

  const notifications = enrollments.map(e => ({
    userId: e.userId,
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
