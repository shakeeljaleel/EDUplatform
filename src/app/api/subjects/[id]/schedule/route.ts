import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: subjectId } = await params;
  const schedules = await prisma.recurringSchedule.findMany({
    where: { subjectId }
  });

  return NextResponse.json({ schedules });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: subjectId } = await params;
  const { dayOfWeek, startTime, duration } = await req.json();

  const schedule = await prisma.recurringSchedule.create({
    data: {
      subjectId,
      dayOfWeek,
      startTime,
      duration
    }
  });

  return NextResponse.json({ schedule });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await prisma.recurringSchedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
