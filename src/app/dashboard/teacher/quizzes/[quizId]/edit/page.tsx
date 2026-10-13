import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import QuizEditForm from './QuizEditForm'

export default async function TeacherQuizEditPage({
  params
}: {
  params: Promise<{ quizId: string }>
}) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login')
  }

  const { quizId } = await params

  // 1. Fetch existing quiz from Prisma
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' }
      },
      subject: { select: { id: true, name: true } },
      attempts: { select: { id: true } }
    }
  })

  if (!quiz) {
    notFound()
  }

  // 2. Fetch linked sessions for this subject if available
  const sessions = quiz.subjectId
    ? await prisma.classSession.findMany({
        where: { subjectId: quiz.subjectId },
        select: { id: true, title: true, scheduledDate: true },
        orderBy: { scheduledDate: 'desc' }
      })
    : []

  // 3. Parse and normalize existing questions and options
  const parsedQuestions = quiz.questions.map((q, idx) => {
    let parsedOpts: any[] = []
    if (q.options) {
      if (typeof q.options === 'string') {
        try {
          parsedOpts = JSON.parse(q.options)
        } catch {
          parsedOpts = []
        }
      } else if (Array.isArray(q.options)) {
        parsedOpts = q.options
      }
    }

    const normalizedOpts = parsedOpts.map((opt: any, optIdx: number) => {
      if (typeof opt === 'string') {
        return {
          id: `opt_${optIdx + 1}`,
          text: opt,
          is_correct: optIdx === q.correctOption,
          imageUrl: ''
        }
      }
      return {
        id: opt.id || `opt_${optIdx + 1}`,
        text: opt.text || '',
        is_correct: opt.is_correct ?? (optIdx === q.correctOption),
        imageUrl: opt.imageUrl || ''
      }
    })

    const finalOpts =
      normalizedOpts.length > 0
        ? normalizedOpts
        : [
            { id: 'opt_1', text: '', is_correct: true, imageUrl: '' },
            { id: 'opt_2', text: '', is_correct: false, imageUrl: '' },
            { id: 'opt_3', text: '', is_correct: false, imageUrl: '' },
            { id: 'opt_4', text: '', is_correct: false, imageUrl: '' }
          ]

    return {
      id: q.id,
      type: q.type || 'MCQ',
      text: q.text || '',
      maxMarks: q.maxMarks || q.points || 10,
      points: q.points || q.maxMarks || 10,
      options: finalOpts,
      correctOption: q.correctOption ?? 0,
      markScheme: q.markScheme || '',
      hasWordLimit: !!q.wordLimit,
      wordLimit: q.wordLimit || 100
    }
  })

  return (
    <QuizEditForm
      quiz={{
        ...quiz,
        dueDate: quiz.dueDate ? quiz.dueDate.toISOString() : null,
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString()
      }}
      initialQuestions={parsedQuestions}
      sessions={sessions.map(s => ({
        ...s,
        scheduledDate: s.scheduledDate ? s.scheduledDate.toISOString() : null
      }))}
    />
  )
}
