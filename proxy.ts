import { NextRequest, NextResponse } from 'next/server';

const TOKEN_KEYS = ['edu_token', 'flexi_token'];
const PROTECTED = [
  '/admin',
  '/dashboard',
  '/fee-management',
  '/staff',
  '/students',
  '/reports',
  '/results',
  '/report-card',
  '/inventory',
  '/settings',
  '/messaging',
  '/instructor-dashboard',
];
const LOGIN_PATH = '/login';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = TOKEN_KEYS.some((key) => Boolean(request.cookies.get(key)?.value));

  const isProtected = PROTECTED.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/fee-management/:path*',
    '/staff/:path*',
    '/students/:path*',
    '/reports/:path*',
    '/results/:path*',
    '/report-card/:path*',
    '/inventory/:path*',
    '/settings/:path*',
    '/messaging/:path*',
    '/instructor-dashboard/:path*',
  ],
};
