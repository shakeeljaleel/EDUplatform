import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as pdf from 'pdf-parse'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parser = new pdf.PDFParse({ data: buffer })
    const data = await parser.getText()
    const text = data.text

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
      Extract student names and their raw marks from the following text. 
      The text is from an exam result document.
      
      TEXT:
      ${text}
      
      Return the data as a JSON array of objects with "name" and "marks" (as a number). 
      Try to match names accurately. If a grade is present, include it as "grade".
      Return ONLY the JSON array.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const jsonStr = response.text().replace(/```json|```/gi, '').trim()
    const extractedData = JSON.parse(jsonStr)

    return NextResponse.json({ results: extractedData })
  } catch (err: any) {
    console.error('PDF Parse Error:', err)
    return NextResponse.json({ error: 'Failed to parse PDF results' }, { status: 500 })
  }
}
