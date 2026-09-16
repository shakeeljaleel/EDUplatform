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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: batchId } = await params;
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const enrollment = await prisma.batchEnrollment.upsert({
    where: {
      userId_batchId: {
        userId,
        batchId
      }
    },
    update: {},
    create: {
      userId,
      batchId,
      role: 'STUDENT'
    },
    include: {
      user: true,
      batch: true
    }
  });

  // Automatically enroll student into subjects of this batch
  const subjects = await prisma.subject.findMany({ where: { batchId } });
  for (const subject of subjects) {
    await prisma.subjectEnrollment.upsert({
      where: {
        subjectId_userId: {
          subjectId: subject.id,
          userId
        }
      },
      update: { status: 'APPROVED' },
      create: {
        subjectId: subject.id,
        userId,
        status: 'APPROVED'
      }
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
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  await prisma.batchEnrollment.deleteMany({
    where: {
      batchId,
      userId
    }
  });

  return NextResponse.json({ success: true });
}
