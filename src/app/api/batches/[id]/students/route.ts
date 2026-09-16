import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
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
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { paymentStatus: true } },
          subjectEnrollments: {
            where: { subject: { batchId } },
            include: { subject: { select: { id: true, name: true } } }
          }
        }
      }
    },
    orderBy: { user: { name: 'asc' } }
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

  // Bulk action: assign subject
  if (body.action === 'assign_subject' && Array.isArray(body.studentIds) && body.subjectId) {
    const { studentIds, subjectId } = body;

    for (const studentId of studentIds) {
      // Ensure batch enrollment exists
      await prisma.batchEnrollment.upsert({
        where: { userId_batchId: { userId: studentId, batchId } },
        update: {},
        create: { userId: studentId, batchId, role: 'STUDENT' }
      });

      // Create subject enrollment
      await prisma.subjectEnrollment.upsert({
        where: { subjectId_userId: { subjectId, userId: studentId } },
        update: { status: 'APPROVED' },
        create: { subjectId, userId: studentId, status: 'APPROVED' }
      });
    }

    return NextResponse.json({ success: true, count: studentIds.length });
  }

  // Single student enrollment
  const { userId } = body;
  if (!userId) {
    return NextResponse.json({ error: 'User ID or bulk action parameters required' }, { status: 400 });
  }

  const enrollment = await prisma.batchEnrollment.upsert({
    where: { userId_batchId: { userId, batchId } },
    update: {},
    create: { userId, batchId, role: 'STUDENT' },
    include: { user: true, batch: true }
  });

  // Automatically enroll student into subjects of this batch
  const subjects = await prisma.subject.findMany({ where: { batchId } });
  for (const subject of subjects) {
    await prisma.subjectEnrollment.upsert({
      where: { subjectId_userId: { subjectId: subject.id, userId } },
      update: { status: 'APPROVED' },
      create: { subjectId: subject.id, userId, status: 'APPROVED' }
    });
  }

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

  // Remove batch enrollments
  await prisma.batchEnrollment.deleteMany({
    where: {
      batchId,
      userId: { in: studentIds }
    }
  });

  // Remove subject enrollments for subjects in this batch
  const subjects = await prisma.subject.findMany({ where: { batchId }, select: { id: true } });
  const subjectIds = subjects.map(s => s.id);

  if (subjectIds.length > 0) {
    await prisma.subjectEnrollment.deleteMany({
      where: {
        subjectId: { in: subjectIds },
        userId: { in: studentIds }
      }
    });
  }

  return NextResponse.json({ success: true, count: studentIds.length });
}
