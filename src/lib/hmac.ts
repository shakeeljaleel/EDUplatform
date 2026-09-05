import crypto from 'crypto'

let hmacSecret = process.env.HMAC_SECRET || process.env.JWT_SECRET || 'helix-hmac-secret-key-2026'

export function getHmacSecret() {
  return hmacSecret
}

export function rotateHmacSecret() {
  hmacSecret = crypto.randomBytes(32).toString('hex')
  return hmacSecret
}

export function generateSignedStreamToken(userId: string, recordingId: string, sessionToken: string, ttlSeconds = 3600): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${userId}:${recordingId}:${expiresAt}:${sessionToken}`
  const signature = crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex')
  
  const token = Buffer.from(JSON.stringify({ userId, recordingId, expiresAt, sessionToken, signature })).toString('base64url')
  return { token, expiresAt }
}

export function verifySignedStreamToken(tokenString: string, expectedRecordingId: string): { valid: boolean; userId?: string; sessionToken?: string; error?: string } {
  try {
    const jsonStr = Buffer.from(tokenString, 'base64url').toString('utf8')
    const { userId, recordingId, expiresAt, sessionToken, signature } = JSON.parse(jsonStr)

    if (recordingId !== expectedRecordingId) {
      return { valid: false, error: 'Recording ID mismatch' }
    }

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      return { valid: false, error: 'Signed URL has expired' }
    }

    const payload = `${userId}:${recordingId}:${expiresAt}:${sessionToken}`
    const expectedSignature = crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid HMAC signature' }
    }

    return { valid: true, userId, sessionToken }
  } catch (err) {
    return { valid: false, error: 'Invalid stream token format' }
  }
}
