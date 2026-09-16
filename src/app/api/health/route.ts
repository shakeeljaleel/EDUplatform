import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateEnv, getJwtSecretKey } from '@/lib/env'
import { SignJWT, jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message?: string; latencyMs?: number }> = {}

  let isHealthy = true

  // 1. Environment Variable Audit Check
  const envResult = validateEnv()
  if (envResult.valid) {
    checks.environment = {
      status: envResult.warnings.length > 0 ? 'warn' : 'pass',
      message: envResult.warnings.length > 0 ? envResult.warnings.join('; ') : 'All required environment variables present and configured.'
    }
  } else {
    isHealthy = false
    checks.environment = {
      status: 'fail',
      message: envResult.errors.join('; ')
    }
  }

  // 2. Database Connectivity Check
  const dbStart = Date.now()
  try {
    const userCount = await prisma.user.count()
    const latencyMs = Date.now() - dbStart
    checks.database = {
      status: 'pass',
      message: `PostgreSQL connection active (${userCount} registered users).`,
      latencyMs
    }
  } catch (dbError: any) {
    isHealthy = false
    console.error('[HEALTH_CHECK_DB_FAILURE]', dbError)
    checks.database = {
      status: 'fail',
      message: `Database connection failed: ${dbError?.message || 'Unknown database error'}`
    }
  }

  // 3. Auth System & JWT Verification Check
  const authStart = Date.now()
  try {
    const key = getJwtSecretKey()
    const token = await new SignJWT({ test: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10s')
      .sign(key)

    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    const latencyMs = Date.now() - authStart

    if (payload?.test === true) {
      checks.auth = {
        status: 'pass',
        message: 'JWT signing and verification operational.',
        latencyMs
      }
    } else {
      isHealthy = false
      checks.auth = {
        status: 'fail',
        message: 'JWT test payload mismatch.'
      }
    }
  } catch (authError: any) {
    isHealthy = false
    console.error('[HEALTH_CHECK_AUTH_FAILURE]', authError)
    checks.auth = {
      status: 'fail',
      message: `Auth JWT verification failed: ${authError?.message || 'Unknown auth error'}`
    }
  }

  const responseTimeMs = Date.now() - startTime

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTimeMs,
      envDetails: envResult.details,
      checks
    },
    { status: isHealthy ? 200 : 503 }
  )
}
