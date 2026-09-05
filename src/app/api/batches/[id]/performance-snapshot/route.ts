import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: batchId } = await params;

  // Fetch all students in the batch
  const students = await prisma.user.findMany({
    where: { 
      role: 'STUDENT',
      enrollments: { some: { batchId } }
    },
    include: {
      quizAttempts: {
        include: { quiz: { include: { questions: true } } }
      },
      examRecords: {
        where: { subject: { batchId } }
      }
    }
  });

  const performanceData = students.map(student => {
    // Calculate Quiz Average (%)
    const quizScores = student.quizAttempts.map(attempt => {
      const totalPoints = attempt.quiz.questions?.reduce((sum: number, q: any) => sum + (q.points || 10), 0) || 100;
      return (attempt.score / totalPoints) * 100;
    });
    const quizAvg = quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0;

    // Calculate Exam Average (%)
    const examScores = student.examRecords.map(record => (record.marks / record.maxMarks) * 100);
    const examAvg = examScores.length > 0 ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0;

    // Composite Score (Simple average of quiz and exam averages)
    let composite = 0;
    if (quizScores.length > 0 && examScores.length > 0) {
      composite = (quizAvg + examAvg) / 2;
    } else {
      composite = quizAvg || examAvg || 0;
    }

    return {
      id: student.id,
      name: student.name,
      quizAvg: Math.round(quizAvg),
      examAvg: Math.round(examAvg),
      composite: Math.round(composite),
      totalAssessments: quizScores.length + examScores.length
    };
  });

  // Sort by composite score
  performanceData.sort((a, b) => b.composite - a.composite);

  // Add ranks
  const rankedData = performanceData.map((s, idx) => ({ ...s, rank: idx + 1 }));

  return NextResponse.json({ 
    leaderboard: rankedData.slice(0, 5),
    watchlist: rankedData.filter(s => s.composite < 40 || (s.totalAssessments > 0 && s.composite < 50)).reverse().slice(0, 5),
    all: rankedData
  });
}
