/**
 * Centralized Environment Variable Validation and Sanitization
 * Hardens the application against missing secrets, invalid database URLs,
 * and malformed multiline keys (e.g., Firebase private keys on Vercel).
 */

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  details: {
    postgresUrl: boolean
    jwtSecret: boolean
    nextAuthSecret: boolean
    nextAuthUrl: boolean
    missingVars: string[]
    nodeEnv: string
    firebaseConfigured: boolean
  }
}

/**
 * Sanitizes multiline environment keys (such as RSA private keys)
 * that may have escaped '\n' characters, JSON wrappers, or quotes when entered into Vercel Dashboard.
 */
export function sanitizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined
  let cleanKey = key.trim()

  // Handle JSON wrapped format (e.g. {"private_key": "..."} or "...")
  if (cleanKey.startsWith('{') || cleanKey.startsWith('"')) {
    try {
      const parsed = JSON.parse(cleanKey)
      if (typeof parsed === 'string') {
        cleanKey = parsed
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.private_key) cleanKey = parsed.private_key
        else if (parsed.privateKey) cleanKey = parsed.privateKey
      }
    } catch {
      // Fallthrough if not valid JSON
    }
  }

  // Strip leading and trailing quotes if left
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
    cleanKey = cleanKey.slice(1, -1)
  }

  // Replace escaped \n with actual newlines
  cleanKey = cleanKey.replace(/\\n/g, '\n')
  return cleanKey
}

/**
 * Returns the JWT / NextAuth secret key for signing and verifying session tokens.
 * Supports NEXTAUTH_SECRET (standard Next.js) and JWT_SECRET.
 */
export function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL_ENV_ERROR] Neither NEXTAUTH_SECRET nor JWT_SECRET is defined in environment variables!')
    }
    return 'fallback-secret-for-development-eduplatform-key-2026'
  }
  return secret
}

/**
 * Encoded Uint8Array key for jose JWT signing
 */
export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret())
}

/**
 * Validates critical environment variables required for platform runtime.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const missingVars: string[] = []

  const postgresUrl = process.env.DATABASE_URL || 
                      process.env.POSTGRES_URL || 
                      process.env.POSTGRES_PRISMA_URL || 
                      process.env.DATABASE_UNPOOLED || 
                      process.env.POSTGRES_URL_NON_POOLING

  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  const jwtSecret = process.env.JWT_SECRET
  const effectiveAuthSecret = nextAuthSecret || jwtSecret

  const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL

  const rawFirebaseKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY
  const firebasePrivateKey = sanitizePrivateKey(rawFirebaseKey)
  const firebaseClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL

  if (!postgresUrl) {
    missingVars.push('DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL)')
    errors.push('Missing database connection string: DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL is required.')
    console.error('[ENV_CHECK_FAILED] Missing required variable: DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL)')
  }

  if (!effectiveAuthSecret) {
    if (process.env.NODE_ENV === 'production') {
      missingVars.push('NEXTAUTH_SECRET (or JWT_SECRET)')
      errors.push('Missing authentication secret: NEXTAUTH_SECRET or JWT_SECRET must be set in production.')
      console.error('[ENV_CHECK_FAILED] Missing required variable: NEXTAUTH_SECRET (or JWT_SECRET)')
    } else {
      warnings.push('Neither NEXTAUTH_SECRET nor JWT_SECRET is set. Using development fallback secret.')
    }
  } else if (effectiveAuthSecret.length < 16) {
    warnings.push('NEXTAUTH_SECRET / JWT_SECRET is shorter than 16 characters. A longer secret (32+ chars) is recommended.')
  }

  if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
    warnings.push('NEXTAUTH_URL is not explicitly set. Requests will infer origin host dynamically.')
  }

  const firebaseConfigured = Boolean(firebasePrivateKey && firebaseClientEmail)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: {
      postgresUrl: Boolean(postgresUrl),
      jwtSecret: Boolean(jwtSecret),
      nextAuthSecret: Boolean(nextAuthSecret),
      nextAuthUrl: Boolean(nextAuthUrl),
      missingVars,
      nodeEnv: process.env.NODE_ENV || 'development',
      firebaseConfigured
    }
  }
}

