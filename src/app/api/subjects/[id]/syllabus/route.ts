import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as pdf from 'pdf-parse'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  try {
    let objectives = await prisma.syllabusObjective.findMany({
      where: { subjectId },
      include: {
        classes: {
          select: { id: true, status: true, syllabusCodes: true }
        }
      },
      orderBy: { code: 'asc' }
    })

    // If no objectives exist for this subject, populate from class sessions syllabusCodes or default biology set
    if (objectives.length === 0) {
      const sessions = await prisma.classSession.findMany({
        where: { subjectId },
        select: { syllabusCodes: true }
      })

      const extractedCodes = new Set<string>()
      sessions.forEach(s => {
        if (s.syllabusCodes) {
          s.syllabusCodes.split(',').forEach(c => {
            const trimmed = c.trim().toUpperCase()
            if (trimmed) extractedCodes.add(trimmed)
          })
        }
      })

      if (extractedCodes.size === 0) {
        ['BIO-1.1', 'BIO-1.2', 'BIO-1.3', 'BIO-1.4', 'BIO-2.1', 'BIO-2.2', 'BIO-2.3', 'BIO-2.4', 'BIO-3.1', 'BIO-3.2', 'BIO-4.1', 'BIO-4.2', 'BIO-4.3', 'BIO-5.1', 'BIO-5.2'].forEach(c => extractedCodes.add(c))
      }

      const defaultDescriptions: Record<string, string> = {
        'BIO-1.1': 'Cell structure and organelles part 1',
        'BIO-1.2': 'Cell structure and organelles part 2',
        'BIO-1.3': 'Mitochondria structure',
        'BIO-1.4': 'ATP Synthesis',
        'BIO-2.1': 'DNA Structure',
        'BIO-2.2': 'DNA Replication',
        'BIO-2.3': 'Protein Synthesis',
        'BIO-2.4': 'Gene Expression',
        'BIO-3.1': 'Cell Division',
        'BIO-3.2': 'Meiosis',
        'BIO-4.1': 'Enzymes',
        'BIO-4.2': 'Metabolism',
        'BIO-4.3': 'Membrane Transport',
        'BIO-5.1': 'Light Dependent Photosynthesis',
        'BIO-5.2': 'Light Independent Photosynthesis'
      }

      for (const code of Array.from(extractedCodes)) {
        await prisma.syllabusObjective.upsert({
          where: { code },
          update: { subjectId },
          create: {
            subjectId,
            code,
            description: defaultDescriptions[code] || `Objective ${code}`,
            curriculum: 'Cambridge A Level'
          }
        })
      }

      objectives = await prisma.syllabusObjective.findMany({
        where: { subjectId },
        include: {
          classes: {
            select: { id: true, status: true, syllabusCodes: true }
          }
        },
        orderBy: { code: 'asc' }
      })
    }

    const taughtSessions = await prisma.classSession.findMany({
      where: { subjectId, status: 'TAUGHT' },
      select: {
        id: true,
        syllabusCodes: true,
        syllabusObjectives: { select: { id: true, code: true } },
        lessonPlan: { select: { syllabusObjectiveId: true } }
      }
    })

    const coveredObjectiveIds = new Set<string>()
    const coveredObjectiveCodes = new Set<string>()

    taughtSessions.forEach(s => {
      if (s.lessonPlan?.syllabusObjectiveId) {
        coveredObjectiveIds.add(s.lessonPlan.syllabusObjectiveId)
      }
      s.syllabusObjectives.forEach(o => {
        coveredObjectiveIds.add(o.id)
        coveredObjectiveCodes.add(o.code.trim().toUpperCase())
      })
      if (s.syllabusCodes) {
        s.syllabusCodes.split(',').forEach(c => {
          const trimmed = c.trim().toUpperCase()
          if (trimmed) coveredObjectiveCodes.add(trimmed)
        })
      }
    })

    const results = objectives.map(o => {
      const isCoveredRelation = o.classes.some(c => c.status === 'TAUGHT')
      const isCoveredByCode = coveredObjectiveCodes.has(o.code.trim().toUpperCase())
      const isCoveredById = coveredObjectiveIds.has(o.id)
      return {
        ...o,
        isCovered: isCoveredRelation || isCoveredByCode || isCoveredById
      }
    })

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Syllabus GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    const contentType = request.headers.get('content-type') || ''
    
    let objectivesToCreate: any[] = []

    if (contentType.includes('multipart/form-data')) {
      // PDF ANALYSIS BRANCH
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

      const buffer = Buffer.from(await file.arrayBuffer())
      const parser = new pdf.PDFParse({ data: buffer })
      const pdfData = await parser.getText()
      const fullText = pdfData.text

      // AI Analysis with Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = `
        You are an expert academic curriculum analyst. Extract all syllabus objectives from the following text.
        For each objective, provide a short unique 'code' (like BIO-1.1 or CH-1) and a clear 'description'.
        Extract EVERY objective mentioned to ensure full syllabus coverage.

        TEXT:
        ${fullText}

        Return the result ONLY as a JSON array of objects:
        [
          {"code": "CODE", "description": "DESCRIPTION"},
          ...
        ]
      `

      const result = await model.generateContent(prompt)
      const response = await result.response
      const aiText = response.text().replace(/```json|```/gi, '').trim()
      const extracted = JSON.parse(aiText)

      objectivesToCreate = extracted.map((o: any) => ({
        subjectId,
        code: o.code,
        description: o.description
      }))

    } else {
      // TRADITIONAL BULK TEXT BRANCH
      const { bulkText } = await request.json()
      if (!bulkText) return NextResponse.json({ error: 'No data provided' }, { status: 400 })

      const lines = bulkText.split('\n').filter((l: string) => l.trim().includes(':'))
      objectivesToCreate = lines.map((l: string) => {
        const [code, ...descParts] = l.split(':')
        return {
          subjectId,
          code: code.trim(),
          description: descParts.join(':').trim()
        }
      })
    }

    if (objectivesToCreate.length === 0) {
      return NextResponse.json({ error: 'No objectives could be extracted' }, { status: 400 })
    }

    // Append to existing objectives
    await prisma.syllabusObjective.createMany({ data: objectivesToCreate })

    return NextResponse.json({ success: true, count: objectivesToCreate.length })
  } catch (error: any) {
    console.error('Syllabus Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  await prisma.syllabusObjective.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
