import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from './src/lib/admin-auth';

function isAllowedWithoutAuth(pathname: string): boolean {
  return (
    pathname === '/admin/login' ||
    pathname === '/api/admin/auth/login' ||
    pathname === '/api/admin/auth/logout'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isAllowedWithoutAuth(pathname)) return NextResponse.next();

  const isAdminApi = pathname.startsWith('/api/admin/');
  const adminUser = process.env.ADMIN_USER?.trim();
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!adminUser || !sessionSecret) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: 'Autenticacao admin nao configurada no servidor' },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL('/admin/login?error=config', request.url));
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (token && (await verifyAdminSessionToken(token, adminUser, sessionSecret))) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

