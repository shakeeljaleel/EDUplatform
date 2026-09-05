import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ParentChildSwitcher from '@/components/ParentChildSwitcher'

export default async function ParentDashboard() {
  const session = await getSession()
  if (!session) return null

  // Fetch parent profile and included children with stats
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          user: true
        }
      }
    }
  })

  const childrenData = await Promise.all(
    (parentProfile?.children || []).map(async (child) => {
      const [attendance, exams, unreadMsgs] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: { userId: child.userId },
          select: { status: true }
        }),
        prisma.examRecord.count({
          where: { userId: child.userId }
        }),
        prisma.directMessage.count({
          where: { recipientId: session.user.id, read: false }
        })
      ])

      const totalClass = attendance.length
      const presentClass = attendance.filter(a => a.status !== 'ABSENT').length
      const attendanceRate = totalClass > 0 ? Math.round((presentClass / totalClass) * 100) : 100

      return {
        id: child.id,
        userId: child.userId,
        paymentStatus: child.paymentStatus || 'Pending',
        stars: child.stars || 0,
        medals: child.medals || 0,
        user: {
          id: child.user.id,
          name: child.user.name,
          email: child.user.email
        },
        attendanceCount: totalClass,
        attendanceRate,
        recentExamCount: exams,
        unreadMessages: unreadMsgs
      }
    })
  )

  return (
    <div className="content-wrapper fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Parent Portal</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 600 }}>
          Track and support your child's academic journey.
        </p>
      </div>

      <ParentChildSwitcher childrenData={childrenData} />
    </div>
  )
}
