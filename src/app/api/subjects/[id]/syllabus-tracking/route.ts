import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: subjectId } = await params;

  try {
    let objectives = await prisma.syllabusObjective.findMany({
      where: { subjectId },
      include: {
        classes: {
          select: { id: true, status: true, syllabusCodes: true }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Auto-seed objectives if empty
    if (objectives.length === 0) {
      const sessions = await prisma.classSession.findMany({
        where: { subjectId },
        select: { syllabusCodes: true }
      });

      const extractedCodes = new Set<string>();
      sessions.forEach(s => {
        if (s.syllabusCodes) {
          s.syllabusCodes.split(',').forEach(c => {
            const trimmed = c.trim().toUpperCase();
            if (trimmed) extractedCodes.add(trimmed);
          });
        }
      });

      if (extractedCodes.size === 0) {
        ['BIO-1.1', 'BIO-1.2', 'BIO-1.3', 'BIO-1.4', 'BIO-2.1', 'BIO-2.2', 'BIO-2.3', 'BIO-2.4', 'BIO-3.1', 'BIO-3.2', 'BIO-4.1', 'BIO-4.2', 'BIO-4.3', 'BIO-5.1', 'BIO-5.2'].forEach(c => extractedCodes.add(c));
      }

      const defaultDescriptions: Record<string, string> = {
        'BIO-1.1': 'Cell structure and organelles part 1',
        'BIO-1.2': 'Cell structure and organelles part 2',
        'BIO-1.3': 'Mitochondria structure',
        'BIO-1.4': 'ATP Synthesis',
        'BIO-2.1': 'DNA Structure',
        'BIO-2.2': 'DNA Replication',
        'BIO-2.3': 'Protein Synthesis',
        'BIO-2.4': 'Gene Expression',
        'BIO-3.1': 'Cell Division',
        'BIO-3.2': 'Meiosis',
        'BIO-4.1': 'Enzymes',
        'BIO-4.2': 'Metabolism',
        'BIO-4.3': 'Membrane Transport',
        'BIO-5.1': 'Light Dependent Photosynthesis',
        'BIO-5.2': 'Light Independent Photosynthesis'
      };

      for (const code of Array.from(extractedCodes)) {
        await prisma.syllabusObjective.upsert({
          where: { code },
          update: { subjectId },
          create: {
            subjectId,
            code,
            description: defaultDescriptions[code] || `Objective ${code}`,
            curriculum: 'Cambridge A Level'
          }
        });
      }

      objectives = await prisma.syllabusObjective.findMany({
        where: { subjectId },
        include: {
          classes: {
            select: { id: true, status: true, syllabusCodes: true }
          }
        },
        orderBy: { code: 'asc' }
      });
    }

    const taughtSessions = await prisma.classSession.findMany({
      where: {
        subjectId,
        status: 'TAUGHT'
      },
      select: {
        taughtAt: true,
        syllabusCodes: true,
        syllabusObjectives: { select: { id: true, code: true } },
        lessonPlan: { select: { syllabusObjectiveId: true } }
      }
    });

    const coveredObjectiveIds = new Set<string>();
    const coveredObjectiveCodes = new Set<string>();

    taughtSessions.forEach(s => {
      if (s.lessonPlan?.syllabusObjectiveId) {
        coveredObjectiveIds.add(s.lessonPlan.syllabusObjectiveId);
      }
      s.syllabusObjectives.forEach(o => {
        coveredObjectiveIds.add(o.id);
        coveredObjectiveCodes.add(o.code.trim().toUpperCase());
      });
      if (s.syllabusCodes) {
        s.syllabusCodes.split(',').forEach(c => {
          const trimmed = c.trim().toUpperCase();
          if (trimmed) coveredObjectiveCodes.add(trimmed);
        });
      }
    });

    const objectivesWithStatus = objectives.map(o => {
      const isCoveredRelation = o.classes.some(c => c.status === 'TAUGHT');
      const isCoveredByCode = coveredObjectiveCodes.has(o.code.trim().toUpperCase());
      const isCoveredById = coveredObjectiveIds.has(o.id);
      return {
        ...o,
        isCovered: isCoveredRelation || isCoveredByCode || isCoveredById
      };
    });

    const total = objectives.length;
    const covered = objectivesWithStatus.filter(o => o.isCovered).length;
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

    // Predictive Analysis
    const taughtDates = taughtSessions.map(s => new Date(s.taughtAt || Date.now()).getTime()).filter(Boolean);
    const firstTaught = taughtDates.length > 0 ? new Date(Math.min(...taughtDates)) : null;
    const lastTaught = taughtDates.length > 0 ? new Date(Math.max(...taughtDates)) : null;
    
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
      objectives: objectivesWithStatus
    });
  } catch (error: any) {
    console.error('Syllabus tracking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
