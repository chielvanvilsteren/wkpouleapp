import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const accept = req.headers.get('accept') ?? ''

  if (accept.includes('text/html')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
    return NextResponse.redirect(`${appUrl}/status`, { status: 302 })
  }

  return NextResponse.json({ ok: true })
}
