import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: batchId } = await params;

  const enrollments = await prisma.batchEnrollment.findMany({
    where: { 
      batchId,
      user: { role: 'STUDENT' } 
    },
    include: {
      batch: true,
      user: {
        include: {
          profile: true,
          subjectEnrollments: {
            where: { subject: { batchId } },
            include: { subject: true }
          }
        }
      }
    },
    orderBy: { user: { name: 'asc' } }
  });

  return NextResponse.json({ students: enrollments });
}
