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
    nodeEnv: string
    firebaseConfigured: boolean
  }
}

/**
 * Sanitizes multiline environment keys (such as RSA private keys)
 * that may have escaped '\n' characters when entered into Vercel Dashboard.
 */
export function sanitizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined
  // Replace escaped \n with actual newlines if present
  return key.replace(/\\n/g, '\n')
}

/**
 * Returns the JWT secret key for signing and verifying tokens.
 * In production (e.g. Vercel), JWT_SECRET must be explicitly configured.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL_ENV_ERROR] JWT_SECRET is not defined in production environment variables!')
    }
    return 'fallback-secret-for-development-eduplatform-key'
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

  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
  const jwtSecret = process.env.JWT_SECRET
  const firebasePrivateKey = sanitizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  const firebaseClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL

  if (!postgresUrl) {
    errors.push('POSTGRES_URL (or DATABASE_URL) is missing. Database queries will fail.')
  }

  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is missing in production environment variables! Sessions will be insecure or invalid.')
    } else {
      warnings.push('JWT_SECRET is missing. Falling back to default development secret.')
    }
  } else if (jwtSecret.length < 16) {
    warnings.push('JWT_SECRET is shorter than 16 characters. A longer secret is recommended for security.')
  }

  const firebaseConfigured = Boolean(firebasePrivateKey && firebaseClientEmail)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: {
      postgresUrl: Boolean(postgresUrl),
      jwtSecret: Boolean(jwtSecret),
      nodeEnv: process.env.NODE_ENV || 'development',
      firebaseConfigured
    }
  }
}
