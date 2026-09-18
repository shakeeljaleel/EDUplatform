import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all SubjectBranchTeacher assignments for this teacher
    const sbtList = await prisma.subjectBranchTeacher.findMany({
      where: session.user.role === 'SUPER_ADMIN' ? {} : { teacherId: session.user.id },
      include: {
        subject: {
          include: {
            batch: true
          }
        },
        branch: true
      }
    })

    // 2. Fetch all active enrollments matching teacher's assigned (subjectId, branchId) combinations
    const groupsMap = new Map<string, any>()
    const allStudentsList: any[] = []

    for (const sbt of sbtList) {
      if (!sbt.subject || !sbt.branch || !sbt.subject.batch) continue

      const key = `${sbt.subjectId}_${sbt.branchId}_${sbt.subject.batchId}`
      const groupTitle = `${sbt.subject.batch.name} — ${sbt.branch.name}`

      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          subjectId: sbt.subjectId,
          branchId: sbt.branchId,
          status: 'active'
        },
        include: {
          student: {
            include: {
              profile: true
            }
          }
        }
      })

      // Fetch past sessions for attendance calculation
      const pastSessions = await prisma.classSession.findMany({
        where: {
          subjectId: sbt.subjectId,
          status: 'TAUGHT'
        },
        select: { id: true }
      })
      const pastSessionIds = pastSessions.map(s => s.id)

      const groupStudents: any[] = []

      for (const e of enrollments) {
        const studentUser = e.student
        if (!studentUser) continue

        // Attendance stats
        const attendanceRecords = pastSessionIds.length > 0
          ? await prisma.attendanceRecord.findMany({
              where: {
                userId: studentUser.id,
                classSessionId: { in: pastSessionIds }
              }
            })
          : []

        const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length
        const totalPast = pastSessionIds.length
        const absentCount = Math.max(0, totalPast - presentCount)
        const attendancePct = totalPast > 0 ? Math.round((presentCount / totalPast) * 100) : 100

        // Quiz attempts history
        const quizAttempts = await prisma.quizAttempt.findMany({
          where: {
            userId: studentUser.id,
            status: 'GRADED',
            quiz: { subjectId: sbt.subjectId }
          },
          include: {
            quiz: { select: { id: true, title: true } },
            answers: { include: { question: true } }
          },
          orderBy: { updatedAt: 'desc' }
        })

        const lastQuiz = quizAttempts[0] || null
        const lastQuizScoreStr = lastQuiz
          ? `${Math.round(lastQuiz.percentageScore)}%`
          : '--'

        const quizHistory = quizAttempts.map(q => ({
          quizId: q.quizId,
          title: q.quiz.title,
          score: q.score,
          maxPossibleScore: q.maxPossibleScore,
          percentage: q.percentageScore,
          stars: q.starsAwarded,
          date: q.updatedAt
        }))

        const studentData = {
          id: studentUser.id,
          name: studentUser.name,
          email: studentUser.email,
          batchId: sbt.subject.batch.id,
          batchName: sbt.subject.batch.name,
          branchId: sbt.branch.id,
          branchName: sbt.branch.name,
          branchColour: sbt.branch.colour || '#2979ff',
          subjectId: sbt.subject.id,
          subjectName: sbt.subject.name,
          subjectColour: sbt.subject.colour || '#2979ff',
          helixScore: studentUser.profile?.helixScore ?? 0,
          stars: studentUser.profile?.stars ?? 0,
          goldMedals: studentUser.profile?.goldMedals ?? 0,
          silverMedals: studentUser.profile?.silverMedals ?? 0,
          bronzeMedals: studentUser.profile?.bronzeMedals ?? 0,
          paymentStatus: studentUser.profile?.paymentStatus || 'Paid',
          attendancePct,
          presentCount,
          absentCount,
          totalPastSessions: totalPast,
          lastQuizScore: lastQuizScoreStr,
          quizHistory
        }

        groupStudents.push(studentData)

        // Add to allStudentsList (prevent exact duplicates if in same subject)
        if (!allStudentsList.some(s => s.id === studentUser.id && s.subjectId === sbt.subjectId && s.branchId === sbt.branchId)) {
          allStudentsList.push(studentData)
        }
      }

      groupsMap.set(key, {
        key,
        groupTitle,
        batchName: sbt.subject.batch.name,
        batchId: sbt.subject.batch.id,
        branchName: sbt.branch.name,
        branchId: sbt.branch.id,
        branchColour: sbt.branch.colour || '#2979ff',
        subjectName: sbt.subject.name,
        subjectId: sbt.subject.id,
        subjectColour: sbt.subject.colour || '#2979ff',
        studentCount: groupStudents.length,
        students: groupStudents
      })
    }

    const groups = Array.from(groupsMap.values())

    return NextResponse.json({
      success: true,
      totalStudents: allStudentsList.length,
      groups,
      allStudents: allStudentsList
    })
  } catch (error: any) {
    console.error('Error fetching teacher students:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
