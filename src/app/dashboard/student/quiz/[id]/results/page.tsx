import React from 'react'
import StudentQuizResultsPage from '@/app/dashboard/student/quizzes/[quizId]/results/page'

export default async function QuizResultsAliasPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <StudentQuizResultsPage params={Promise.resolve({ quizId: id })} />
}
