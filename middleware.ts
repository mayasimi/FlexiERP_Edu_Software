import { NextRequest, NextResponse } from 'next/server';

const TOKEN_KEY = 'flexi_token';
const PROTECTED = ['/instructor-dashboard'];
const LOGIN_PATH = '/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;

  const isProtected = PROTECTED.some(prefix => pathname.startsWith(prefix));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/instructor-dashboard/:path*'],
};
