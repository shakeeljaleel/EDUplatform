import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: batchId } = await params;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { batchId },
    include: {
      batch: true,
      branch: true,
      subject: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { paymentStatus: true } }
        }
      }
    },
    orderBy: { student: { name: 'asc' } }
  });

  return NextResponse.json({ students: enrollments });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: batchId } = await params;
  const body = await req.json();

  const { studentId, subjectId, branchId } = body;
  if (!studentId || !subjectId || !branchId) {
    return NextResponse.json({ error: 'studentId, subjectId, and branchId required' }, { status: 400 });
  }

  const enrollment = await prisma.studentEnrollment.upsert({
    where: { id: `enroll-${studentId}-${subjectId}` },
    update: { status: 'active', branchId },
    create: { id: `enroll-${studentId}-${subjectId}`, studentId, batchId, branchId, subjectId, status: 'active' },
    include: { student: true, batch: true, branch: true, subject: true }
  });

  return NextResponse.json({ enrollment });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: batchId } = await params;
  
  let studentIds: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body.studentIds)) {
      studentIds = body.studentIds;
    }
  } catch {
    // Fallback to URL searchParams
  }

  if (studentIds.length === 0) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (userId) studentIds.push(userId);
  }

  if (studentIds.length === 0) {
    return NextResponse.json({ error: 'Student ID(s) required' }, { status: 400 });
  }

  // Remove student enrollments
  await prisma.studentEnrollment.deleteMany({
    where: {
      batchId,
      studentId: { in: studentIds }
    }
  });

  return NextResponse.json({ success: true, count: studentIds.length });
}
