import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublicPath = path === '/login' || path === '/register' || path === '/' || path.startsWith('/api/')

  if (isPublicPath && path !== '/') {
    return NextResponse.next()
  }

  const session = await getSession()

  if (!session) {
    if (path !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  const role = session.user.role

  if (path === '/' || path === '/login') {
    if (role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/dashboard/super-admin', request.url))
    if (role === 'TEACHER') return NextResponse.redirect(new URL('/dashboard/teacher', request.url))
    if (role === 'STUDENT') return NextResponse.redirect(new URL('/dashboard/student', request.url))
    if (role === 'PARENT') return NextResponse.redirect(new URL('/dashboard/parent', request.url))
    if (role === 'ASSISTANT') return NextResponse.redirect(new URL('/dashboard/assistant', request.url))
    return NextResponse.next()
  }

  // Basic Role-Based Protection
  if (path.startsWith('/dashboard/super-admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (path.startsWith('/dashboard/teacher') && role !== 'TEACHER') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (path.startsWith('/dashboard/student') && role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (path.startsWith('/dashboard/parent') && role !== 'PARENT') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (path.startsWith('/dashboard/assistant') && role !== 'ASSISTANT') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
