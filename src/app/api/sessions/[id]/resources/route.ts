import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const session = await getSession();
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, url, type, isPreWatch } = await req.json();

  const resource = await prisma.classResource.create({
    data: {
      sessionId,
      title,
      url,
      type,
      isPreWatch: isPreWatch ?? true
    }
  });

  return NextResponse.json(resource);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const resources = await prisma.classResource.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json(resources);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resourceId = searchParams.get('id');

  if (!resourceId) return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });

  await prisma.classResource.delete({ where: { id: resourceId } });
  return NextResponse.json({ success: true });
}
