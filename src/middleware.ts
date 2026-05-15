import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuration : Mettre à 'true' pour activer la maintenance
const MAINTENANCE_MODE = true;

export function middleware(request: NextRequest) {
  // On autorise l'accès aux assets statiques et à l'image de maintenance
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/maintenance') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (MAINTENANCE_MODE && request.nextUrl.pathname !== '/maintenance') {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
