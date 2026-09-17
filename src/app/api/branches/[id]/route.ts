import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      batchBranches: {
        include: {
          batch: true
        }
      }
    }
  })

  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  return NextResponse.json({ branch })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { name, address, type, colour } = await req.json()

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(type !== undefined && { type: type === 'Online' ? 'Online' : 'Physical' }),
      ...(colour !== undefined && { colour })
    }
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'UPDATE_BRANCH',
      targetType: 'BRANCH',
      targetId: id,
      details: JSON.stringify({ name: updated.name, type: updated.type })
    }
  })

  return NextResponse.json({ branch: updated })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  await prisma.branch.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'DELETE_BRANCH',
      targetType: 'BRANCH',
      targetId: id,
      details: JSON.stringify({ name: branch.name })
    }
  })

  return NextResponse.json({ success: true })
}
