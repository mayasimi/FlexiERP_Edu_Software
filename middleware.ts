import { NextRequest, NextResponse } from 'next/server';

const TOKEN_KEY = 'flexi_token';
const PROTECTED = ['/dashboard', '/instructor-dashboard', '/portal'];
const LOGIN_PATH = '/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;
  const allowUnauthenticated =
    ['1', 'true', 'yes'].includes((process.env.AUTH_BYPASS ?? '').toLowerCase()) ||
    ['1', 'true', 'yes'].includes((process.env.NEXT_PUBLIC_AUTH_BYPASS ?? '').toLowerCase())

  const isProtected = PROTECTED.some(prefix => pathname.startsWith(prefix));

  if (!allowUnauthenticated && isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/instructor-dashboard/:path*', '/portal/:path*'],
};
