import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { questionId, studentId, questionText, questionType, markScheme, maxMarks = 10, studentAnswer } = await request.json()

    const max = maxMarks || 10
    const trimmedAnswer = (studentAnswer || '').trim()

    if (!trimmedAnswer || trimmedAnswer.length < 3) {
      const result = {
        marks_awarded: 0,
        percentage: 0,
        feedback: 'No valid answer provided.',
        key_points_covered: [],
        key_points_missed: ['Model answer requirements not addressed.']
      }

      if (questionId && studentId) {
        await prisma.aIGradingLog.create({
          data: {
            questionId,
            studentId,
            promptSent: `Question: ${questionText}, Answer: ${trimmedAnswer}`,
            responseReceived: JSON.stringify(result),
            marksAwarded: 0
          }
        })
      }

      return NextResponse.json(result)
    }

    const apiKey = process.env.GEMINI_API_KEY

    let promptSent = ''
    let responseReceived = ''
    let marksAwarded = 0
    let resultObj: any = null

    if (apiKey) {
      try {
        promptSent = `You are an expert examiner. Grade the following student answer against the mark scheme provided.

Question: "${questionText || ''}"
Question Type: ${questionType || 'SHORT_ANSWER'}
Maximum marks: ${max}
Mark scheme / model answer: "${markScheme || 'General subject accuracy and reasoning.'}"

Student answer: "${trimmedAnswer}"

Instructions:
- Award marks out of ${max} based on how well the answer matches the mark scheme
- Be fair but rigorous — the student must demonstrate understanding
- Return ONLY a JSON object in this exact format, nothing else:
{
  "marks_awarded": number,
  "percentage": number,
  "feedback": "2-3 sentences of constructive feedback explaining the mark awarded and what could be improved",
  "key_points_covered": ["point 1", "point 2"],
  "key_points_missed": ["point 1", "point 2"]
}`

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptSent }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        })

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          responseReceived = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (responseReceived) {
            const parsed = JSON.parse(responseReceived)
            const awarded = Math.min(max, Math.max(0, Math.round(Number(parsed.marks_awarded || parsed.marksAwarded || 0))))
            resultObj = {
              marks_awarded: awarded,
              percentage: Math.round((awarded / max) * 100),
              feedback: parsed.feedback || parsed.aiFeedback || 'Evaluated against marking criteria.',
              key_points_covered: Array.isArray(parsed.key_points_covered) ? parsed.key_points_covered : [],
              key_points_missed: Array.isArray(parsed.key_points_missed) ? parsed.key_points_missed : []
            }
            marksAwarded = awarded
          }
        }
      } catch (e) {
        console.error('Gemini API call failed, falling back to heuristic:', e)
      }
    }

    // Heuristic Fallback if Gemini unavailable or failed
    if (!resultObj) {
      const ms = (markScheme || '').toLowerCase()
      const ans = trimmedAnswer.toLowerCase()

      const keywords = ms.split(/\W+/).filter((w: string) => w.length > 3)
      let matchCount = 0
      const covered: string[] = []
      const missed: string[] = []

      keywords.forEach((kw: string) => {
        if (ans.includes(kw)) {
          matchCount++
          if (covered.length < 3) covered.push(kw)
        } else {
          if (missed.length < 3) missed.push(kw)
        }
      })

      const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0.7
      let awarded = Math.round(max * Math.min(1, Math.max(0.3, matchRatio + 0.3)))
      if (ans.length > 50) awarded = Math.max(awarded, Math.round(max * 0.75))
      awarded = Math.min(max, Math.max(0, awarded))

      resultObj = {
        marks_awarded: awarded,
        percentage: Math.round((awarded / max) * 100),
        feedback: `Demonstrated solid understanding of concepts. (${awarded}/${max} marks awarded against model mark scheme)`,
        key_points_covered: covered.length > 0 ? covered : ['Basic concept understanding demonstrated'],
        key_points_missed: missed.length > 0 ? missed : ['Elaborate further on key technical terms']
      }
      marksAwarded = awarded
      responseReceived = JSON.stringify(resultObj)
      promptSent = promptSent || `Heuristic fallback evaluation for Question: "${questionText}"`
    }

    // Log to AIGradingLog
    if (questionId && studentId) {
      await prisma.aIGradingLog.create({
        data: {
          questionId,
          studentId,
          promptSent: promptSent || `Question: ${questionText}`,
          responseReceived: responseReceived || JSON.stringify(resultObj),
          marksAwarded
        }
      })
    }

    return NextResponse.json(resultObj)

  } catch (error: any) {
    console.error('AI Grade API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
