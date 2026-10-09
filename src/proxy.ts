import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('crm_session')?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Protect API routes
  if (isApiRoute && !isAuthRoute && !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Protect Page routes
  if (!token && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
