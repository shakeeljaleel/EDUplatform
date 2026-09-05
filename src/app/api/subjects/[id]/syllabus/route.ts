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

  const objectives = await prisma.syllabusObjective.findMany({
    where: { subjectId },
    include: {
      classes: {
        select: { status: true }
      }
    },
    orderBy: { code: 'asc' }
  })

  const results = objectives.map(o => ({
    ...o,
    isCovered: o.classes.some(c => c.status === 'TAUGHT')
  }))

  return NextResponse.json(results)
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
