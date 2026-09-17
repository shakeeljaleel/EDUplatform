import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const BRANCH_COLOUR_PALETTE = [
  '#00c853', // Green (Main Campus)
  '#2979ff', // Blue (Kohuwala)
  '#aa00ff', // Purple (Wattala)
  '#ff6d00', // Orange (Online)
  '#f50057', // Pink
  '#00bcd4', // Cyan
  '#ffab00'  // Amber
]

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const branches = await prisma.branch.findMany({
    include: {
      batchBranches: {
        include: {
          batch: {
            include: {
              subjects: {
                include: {
                  branchTeachers: {
                    include: {
                      teacher: { select: { id: true, name: true } },
                      assistants: { include: { assistant: { select: { id: true, name: true } } } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      studentEnrollments: {
        select: {
          studentId: true,
          batchId: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  const formatted = branches.map(branch => {
    const runningBatches = branch.batchBranches.map(bb => {
      const b = bb.batch
      const subjectsForBranch = b.subjects.map(s => {
        const teachersForBranch = s.branchTeachers.filter(bt => bt.branchId === branch.id)
        return {
          id: s.id,
          name: s.name,
          colour: s.colour,
          teachers: teachersForBranch.map(bt => ({
            id: bt.teacher.id,
            name: bt.teacher.name,
            assistant: bt.assistants[0] ? bt.assistants[0].assistant.name : null
          }))
        }
      })

      const branchStudents = branch.studentEnrollments.filter(se => se.batchId === b.id)
      const uniqueStudentCount = new Set(branchStudents.map(s => s.studentId)).size

      return {
        id: b.id,
        name: b.name,
        academicLevel: b.academicLevel,
        status: b.status,
        studentCount: uniqueStudentCount,
        subjects: subjectsForBranch
      }
    })

    const totalUniqueStudents = new Set(branch.studentEnrollments.map(se => se.studentId)).size

    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      type: branch.type,
      colour: branch.colour,
      createdAt: branch.createdAt,
      batchCount: branch.batchBranches.length,
      studentCount: totalUniqueStudents,
      batches: runningBatches
    }
  })

  return NextResponse.json({ branches: formatted })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, address, type, colour } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })

    // Auto assign colour if not provided
    let assignedColour = colour
    if (!assignedColour) {
      const count = await prisma.branch.count()
      assignedColour = BRANCH_COLOUR_PALETTE[count % BRANCH_COLOUR_PALETTE.length]
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        type: type === 'Online' ? 'Online' : 'Physical',
        colour: assignedColour
      }
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'CREATE_BRANCH',
        targetType: 'BRANCH',
        targetId: branch.id,
        details: JSON.stringify({ name: branch.name, type: branch.type, colour: branch.colour })
      }
    })

    return NextResponse.json({ success: true, branch })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
