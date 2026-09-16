import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getJwtSecretKey } from '@/lib/env'

export async function encrypt(payload: any) {
  const key = getJwtSecretKey()
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function decrypt(input: string): Promise<any> {
  try {
    const key = getJwtSecretKey()
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    // Return null on invalid, expired, or malformed JWT signature
    return null
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return null

    const payload = await decrypt(session)
    if (!payload || !payload.user?.id) return null

    // Persistent ActiveSession DB check (stateless across Vercel cold starts)
    if (payload.sessionToken) {
      const active = await prisma.activeSession.findUnique({
        where: { userId: payload.user.id }
      })
      if (active && active.token !== payload.sessionToken) {
        return null
      }
    }

    // Account status check
    const user = await prisma.user.findUnique({
      where: { id: payload.user.id },
      select: { accountDisabled: true }
    })

    if (user?.accountDisabled) return null

    return payload
  } catch (error: any) {
    if (error?.digest !== 'DYNAMIC_SERVER_USAGE') {
      console.error('[AUTH_GET_SESSION_ERROR]', error)
    }
    return null
  }
}

export async function createSession(user: { id: string; role: string; name: string }) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const sessionToken = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36)

  const session = await encrypt({ user, sessionToken, expires })
  
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  })

  return sessionToken
}

export async function deleteSession() {
  try {
    const cookieStore = await cookies()
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      sameSite: 'lax',
      path: '/',
    })
  } catch (error) {
    console.error('[AUTH_DELETE_SESSION_ERROR]', error)
  }
}
