// /src/middleware.js
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-server';

// ----- Public paths -----
const PUBLIC_PAGES = new Set(['/login', '/access-denied', '/auth']);

function isApiPath(pathname) {
  return pathname.startsWith('/api/');
}
function isStaticPath(pathname) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets/') ||
    pathname.includes('.') // files with extensions
  );
}
function rewriteToAccessDenied(request) {
  const url = request.nextUrl.clone();
  url.pathname = '/access-denied';
  url.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.rewrite(url);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (isStaticPath(pathname)) return NextResponse.next();

  if (isApiPath(pathname)) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Public read access (used by the website): GET/HEAD.
    // Login/logout/check are open. Every other API call (create/edit/delete)
    // requires a valid admin session.
    const isRead = request.method === 'GET' || request.method === 'HEAD';
    const isAuthApi = pathname.startsWith('/api/auth/');
    if (!isRead && !isAuthApi) {
      const c = request.cookies.get('panama_admin_session');
      const ok = c ? await verifySession(c.value) : null;
      if (!ok) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
  }

  // Public pages
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Admin-only pages
  const cookie = request.cookies.get('panama_admin_session');
  if (!cookie) return rewriteToAccessDenied(request);

  const session = await verifySession(cookie.value);
  if (!session) {
    const res = rewriteToAccessDenied(request);
    res.cookies.delete('panama_admin_session');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
