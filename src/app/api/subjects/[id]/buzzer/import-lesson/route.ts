import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = await params;
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lessonPlanId } = await req.json();

  const lessonPlan = await prisma.lessonPlan.findUnique({
    where: { id: lessonPlanId }
  });

  if (!lessonPlan) {
    return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
  }

  const quizData = JSON.parse(lessonPlan.quizDraft || '[]');
  if (quizData.length === 0) {
    return NextResponse.json({ error: 'No quiz questions found in this lesson plan' }, { status: 400 });
  }

  const slug = lessonPlan.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  const joinCode = `${slug}${Math.floor(1000 + Math.random() * 9000)}`

  // Create a new BuzzerSession
  const buzzerSession = await prisma.buzzerSession.create({
    data: {
      subjectId,
      hostId: session.user.id,
      title: `Buzzer: ${lessonPlan.title}`,
      joinCode,
      status: 'SETUP',
      teams: {
        create: [
          { name: 'Team Alpha', color: '#059669' },
          { name: 'Team Beta', color: '#2563eb' }
        ]
      },
      rounds: {
        create: quizData.map((q: any, i: number) => ({
          question: q.question,
          points: 10,
          order: i,
          status: 'PENDING'
        }))
      }
    },
    include: {
      teams: true,
      rounds: true
    }
  });

  return NextResponse.json({ success: true, session: buzzerSession });
}
