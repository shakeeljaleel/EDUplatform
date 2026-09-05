import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await prisma.studentChangeRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      student: true,
      teacher: true,
    },
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json({ requests });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestId, status } = await req.json();

  const request = await prisma.studentChangeRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  if (status === 'APPROVED') {
    if (request.type === 'REMOVE') {
      await prisma.batchEnrollment.deleteMany({
        where: { userId: request.studentId, batchId: request.batchId }
      });
      // Also remove from subjects in that batch
      await prisma.subjectEnrollment.deleteMany({
        where: { userId: request.studentId, subject: { batchId: request.batchId } }
      });
    } else if (request.type === 'SWITCH' && request.newBatchId) {
      await prisma.batchEnrollment.updateMany({
        where: { userId: request.studentId, batchId: request.batchId },
        data: { batchId: request.newBatchId }
      });
      // Re-map subject enrollments if applicable, or just leave for manual subject reassignment
    }
  }

  await prisma.studentChangeRequest.update({
    where: { id: requestId },
    data: { status }
  });

  return NextResponse.json({ success: true });
}
