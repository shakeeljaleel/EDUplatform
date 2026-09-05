import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import * as pdf from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parser = new pdf.PDFParse({ data: buffer })
    const data = await parser.getText()
    const text = data.text

    // Use Gemini to extract attendance data
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
      Extract student attendance from the following text extracted from a PDF.
      The output MUST be a JSON array of objects with "name" and "status" (either "PHYSICAL" or "ABSENT").
      Look for names and check if they are marked as present/attending.
      Text:
      ${text}
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Extract JSON from response (handle markdown blocks)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    const attendanceData = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    if (sessionId && attendanceData.length > 0) {
      // Get all students for this session's subject to match names
      const sessionData = await prisma.classSession.findUnique({
        where: { id: sessionId },
        include: { subject: { include: { enrollments: { include: { user: true } } } } }
      })

      if (sessionData) {
        const enrolledStudents = sessionData.subject.enrollments.map(e => e.user)
        
        for (const record of attendanceData) {
          // Find closest matching student name
          const student = enrolledStudents.find(s => 
            s.name.toLowerCase().includes(record.name.toLowerCase()) || 
            record.name.toLowerCase().includes(s.name.toLowerCase())
          )

          if (student) {
            await prisma.attendanceRecord.upsert({
              where: {
                classSessionId_userId: {
                  classSessionId: sessionId,
                  userId: student.id
                }
              },
              update: { status: record.status },
              create: {
                classSessionId: sessionId,
                userId: student.id,
                status: record.status
              }
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true, count: attendanceData.length, data: attendanceData })

  } catch (error: any) {
    console.error('PDF Parse Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
