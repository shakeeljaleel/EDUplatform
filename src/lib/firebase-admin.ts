import { sanitizePrivateKey } from '@/lib/env'

/**
 * Safely parses and returns Firebase Admin credentials from environment variables.
 * Handles:
 * 1. Raw PEM private keys with real newlines
 * 2. Escaped string private keys with '\n'
 * 3. JSON wrapped private keys (e.g. {"private_key": "..."})
 * 4. Full JSON service account string in FIREBASE_ADMIN_PRIVATE_KEY
 */
export function getFirebaseAdminCredentials() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY

  if (!rawKey) {
    return {
      isConfigured: false,
      projectId,
      clientEmail,
      privateKey: undefined,
      error: 'FIREBASE_ADMIN_PRIVATE_KEY environment variable is not defined.'
    }
  }

  // Check if the entire rawKey is a full JSON service account object
  if (rawKey.trim().startsWith('{')) {
    try {
      const parsedJson = JSON.parse(rawKey.trim())
      if (parsedJson.private_key && parsedJson.client_email) {
        return {
          isConfigured: true,
          projectId: parsedJson.project_id || projectId,
          clientEmail: parsedJson.client_email,
          privateKey: sanitizePrivateKey(parsedJson.private_key),
          error: undefined
        }
      }
    } catch {
      // Not a full service account JSON object, continue with standard key parsing
    }
  }

  const sanitizedKey = sanitizePrivateKey(rawKey)

  const isConfigured = Boolean(clientEmail && sanitizedKey && sanitizedKey.includes('-----BEGIN PRIVATE KEY-----'))

  return {
    isConfigured,
    projectId,
    clientEmail,
    privateKey: sanitizedKey,
    error: isConfigured ? undefined : 'Firebase credentials incomplete or private key header missing.'
  }
}
