import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin')) {
    const auth = req.headers.get('authorization')
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const expected = 'Basic ' + Buffer.from(`admin:${password}`).toString('base64')

    if (auth !== expected) {
      return new NextResponse('دسترسی ممنوع', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Panel"',
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
