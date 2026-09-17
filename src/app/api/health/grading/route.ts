import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  let databasePass = false
  let geminiApiKeyPass = false
  let dbErrorMessage = ''

  // 1. Check database connectivity by querying subjects table
  try {
    await prisma.subject.findFirst({
      select: { id: true }
    })
    databasePass = true
  } catch (err: any) {
    console.error('Grading Health Check DB Error:', err)
    dbErrorMessage = err?.message || 'Database query failed'
  }

  // 2. Check GEMINI_API_KEY environment variable presence
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    geminiApiKeyPass = true
  }

  const overallStatus = (databasePass && geminiApiKeyPass) ? 'ok' : databasePass ? 'degraded' : 'error'
  const statusCode = overallStatus === 'error' ? 500 : overallStatus === 'degraded' ? 200 : 200

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        pass: databasePass,
        error: dbErrorMessage || null
      },
      geminiApiKey: {
        pass: geminiApiKeyPass,
        message: geminiApiKeyPass ? 'GEMINI_API_KEY is configured' : 'GEMINI_API_KEY is missing or empty'
      }
    }
  }, { status: statusCode })
}
