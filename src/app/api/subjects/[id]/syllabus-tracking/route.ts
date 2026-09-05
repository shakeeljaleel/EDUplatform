import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: subjectId } = await params;

  // 1. Get all objectives for this subject
  const objectives = await prisma.syllabusObjective.findMany({
    where: { subjectId }
  });

  // 2. Get all class sessions that covered an objective (via lesson plan)
  const coveredSessions = await prisma.classSession.findMany({
    where: {
      subjectId,
      status: 'TAUGHT',
      lessonPlanId: { not: null },
      lessonPlan: { syllabusObjectiveId: { not: null } }
    },
    include: {
      lessonPlan: true
    }
  });

  const coveredObjectiveIds = new Set(coveredSessions.map(s => s.lessonPlan?.syllabusObjectiveId));
  
  const total = objectives.length;
  const covered = Array.from(coveredObjectiveIds).length;
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  // 3. Predictive Analysis
  // Calculate average teaching rate (objectives per week)
  const firstTaught = coveredSessions.length > 0 ? new Date(Math.min(...coveredSessions.map(s => new Date(s.taughtAt!).getTime()))) : null;
  const lastTaught = coveredSessions.length > 0 ? new Date(Math.max(...coveredSessions.map(s => new Date(s.taughtAt!).getTime()))) : null;
  
  let estimatedEndDate = null;
  if (firstTaught && lastTaught && covered > 0) {
    const durationWeeks = Math.max(1, (lastTaught.getTime() - firstTaught.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const ratePerWeek = covered / durationWeeks;
    
    if (ratePerWeek > 0) {
      const remaining = total - covered;
      const weeksNeeded = remaining / ratePerWeek;
      estimatedEndDate = new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
    }
  }

  return NextResponse.json({
    total,
    covered,
    percentage,
    estimatedEndDate,
    objectives: objectives.map(obj => ({
      ...obj,
      isCovered: coveredObjectiveIds.has(obj.id)
    }))
  });
}
