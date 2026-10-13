import React from 'react'
import StudentQuizTakingPage from '@/app/dashboard/student/quizzes/[quizId]/page'

export default async function StudentQuizAliasPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <StudentQuizTakingPage params={Promise.resolve({ quizId: id })} />
}
