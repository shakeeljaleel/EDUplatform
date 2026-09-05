import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as pdf from 'pdf-parse'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  try {
    const formData = await request.formData()
    const title = formData.get('title') as string
    const studentId = (formData.get('studentId') as string) || session.user.id
    const markingSchemeFile = formData.get('markingScheme') as File
    const answerScriptFile = formData.get('answerScript') as File

    if (!markingSchemeFile || !answerScriptFile) {
      return NextResponse.json({ error: 'Missing files' }, { status: 400 })
    }

    // Role-based validation
    if (session.user.role === 'STUDENT') {
      // Paywall check
      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } })
      if (!profile || profile.paymentStatus !== 'Paid') {
        return NextResponse.json({ error: 'Only paid students can access AI paper marking' }, { status: 403 })
      }
      // Ensure student marks their own paper
      if (studentId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Extract text from PDFs
    const markingSchemeBuffer = Buffer.from(await markingSchemeFile.arrayBuffer())
    const answerScriptBuffer = Buffer.from(await answerScriptFile.arrayBuffer())

    const msParser = new pdf.PDFParse({ data: markingSchemeBuffer })
    const asParser = new pdf.PDFParse({ data: answerScriptBuffer })
    
    const markingSchemeData = await msParser.getText()
    const answerScriptData = await asParser.getText()

    const markingSchemeText = markingSchemeData.text
    const answerScriptText = answerScriptData.text

    // AI Prompt
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
      You are an expert academic examiner. Grade the following answer script based on the provided marking scheme.
      
      MARKING SCHEME:
      ${markingSchemeText}
      
      STUDENT ANSWER SCRIPT:
      ${answerScriptText}
      
      Provide a detailed evaluation in the following JSON format:
      {
        "totalMarks": number,
        "maxMarks": number,
        "feedback": "Detailed question-by-question feedback string",
        "aiSummary": "Overall summary of student's performance"
      }
      Return ONLY the JSON.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean JSON response (sometimes Gemini adds markdown blocks)
    const jsonStr = text.replace(/```json|```/gi, '').trim()
    const gradingResult = JSON.parse(jsonStr)

    // Create PaperGrading record
    const grading = await prisma.paperGrading.create({
      data: {
        subjectId,
        studentId,
        submittedById: session.user.id,
        title,
        markingSchemeText,
        answerScriptText,
        status: 'COMPLETED',
        totalMarks: gradingResult.totalMarks,
        maxMarks: gradingResult.maxMarks,
        feedback: gradingResult.feedback,
        aiSummary: gradingResult.aiSummary,
        addedToGraph: true
      }
    })

    // Automatically add to ExamRecord for performance tracking
    await prisma.examRecord.create({
      data: {
        subjectId,
        userId: studentId,
        title: `AI Graded: ${title}`,
        marks: gradingResult.totalMarks,
        maxMarks: gradingResult.maxMarks,
        grade: 'AI',
        date: new Date()
      }
    })

    return NextResponse.json({ grading })
  } catch (err: any) {
    console.error('Grading Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to process AI grading' }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  const gradings = await prisma.paperGrading.findMany({
    where: {
      subjectId,
      OR: [
        { studentId: session.user.id },
        { submittedById: session.user.id }
      ]
    },
    include: {
      student: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ gradings })
}
