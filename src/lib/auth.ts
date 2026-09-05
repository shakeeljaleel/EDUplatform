import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-development'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload
}

import { prisma } from '@/lib/prisma'

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  try {
    const payload = await decrypt(session)
    if (payload?.user?.id && payload?.sessionToken) {
      const active = await prisma.activeSession.findUnique({
        where: { userId: payload.user.id }
      })
      if (active && active.token !== payload.sessionToken) {
        return null
      }
      const u = await prisma.user.findUnique({
        where: { id: payload.user.id },
        select: { accountDisabled: true }
      })
      if (u?.accountDisabled) return null
    }
    return payload
  } catch (error) {
    return null
  }
}

export async function createSession(user: { id: string; role: string; name: string }) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const sessionToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
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
  const cookieStore = await cookies()
  cookieStore.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  })
}
