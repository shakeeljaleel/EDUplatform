import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batchId = searchParams.get('batchId')

  const subjects = await prisma.subject.findMany({
    where: batchId ? { batchId } : undefined,
    include: {
      batch: true,
      branchTeachers: {
        include: {
          branch: true,
          teacher: { select: { id: true, name: true, email: true } },
          assistants: {
            include: {
              assistant: { select: { id: true, name: true, email: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ subjects })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { batchId, name, colour, description } = await req.json()

  if (!batchId || !name?.trim()) {
    return NextResponse.json({ error: 'Batch ID and Subject name are required' }, { status: 400 })
  }

  // Validation: A batch must have at least one branch before subjects can be added
  const branchCount = await prisma.batchBranch.count({
    where: { batchId }
  })

  if (branchCount === 0) {
    return NextResponse.json({
      error: 'A batch must have at least one branch before subjects can be added.'
    }, { status: 400 })
  }

  const subject = await prisma.subject.create({
    data: {
      batchId,
      name: name.trim(),
      colour: colour || '#2979ff',
      description: description?.trim() || null
    },
    include: {
      batch: true,
      branchTeachers: {
        include: {
          branch: true,
          teacher: { select: { id: true, name: true, email: true } },
          assistants: {
            include: { assistant: { select: { id: true, name: true, email: true } } }
          }
        }
      }
    }
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'CREATE_SUBJECT',
      targetType: 'SUBJECT',
      targetId: subject.id,
      details: JSON.stringify({ batchId, name: subject.name, colour: subject.colour })
    }
  })

  return NextResponse.json({ subject })
}
