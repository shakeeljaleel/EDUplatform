import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, studentId, batchId, newBatchId } = await req.json();

  const request = await prisma.studentChangeRequest.create({
    data: {
      type,
      studentId,
      teacherId: session.user.id,
      batchId,
      newBatchId,
      status: 'PENDING'
    }
  });

  return NextResponse.json({ request });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await prisma.studentChangeRequest.findMany({
    where: { teacherId: session.user.id },
    include: { student: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ requests });
}
