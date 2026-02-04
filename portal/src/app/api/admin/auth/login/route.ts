import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
} from '@/lib/admin-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  const expectedUser = process.env.ADMIN_USER?.trim();
  const expectedPass = process.env.ADMIN_PASS;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!expectedUser || !expectedPass || !sessionSecret) {
    return NextResponse.json(
      { error: 'Autenticacao admin nao configurada no servidor' },
      { status: 503 }
    );
  }

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json({ error: 'Credenciais invalidas' }, { status: 401 });
  }

  const token = await createAdminSessionToken(expectedUser, sessionSecret);
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return response;
}

