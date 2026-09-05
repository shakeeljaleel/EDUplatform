import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: recordingId } = await params

  try {
    const acceptance = await prisma.recordingTermsAcceptance.upsert({
      where: { recordingId_userId: { recordingId, userId: session.user.id } },
      create: {
        recordingId,
        userId: session.user.id,
        acceptedAt: new Date()
      },
      update: {
        acceptedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, acceptance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
