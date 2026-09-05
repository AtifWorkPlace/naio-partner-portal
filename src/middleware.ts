import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'naio-partner-secret-jwt-key-2026-development-mode'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define protected route prefixes
  const isAdminRoute = pathname.startsWith('/api/admin') || pathname.startsWith('/admin');
  const isDistributorRoute =
    pathname.startsWith('/api/distributor') ||
    pathname.startsWith('/api/affiliate') ||
    pathname.startsWith('/affiliate') ||
    pathname.startsWith('/distributor');

  if (!isAdminRoute && !isDistributorRoute) {
    return NextResponse.next();
  }

  // 2. Extract JWT token from cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // 3. Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = (payload.role as string)?.toUpperCase();

    // 4. Role-based Access Control
    if (isAdminRoute && userRole !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (
      isDistributorRoute &&
      userRole !== 'DISTRIBUTOR' &&
      userRole !== 'ADMIN' &&
      userRole !== 'AFFILIATE'
    ) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Distributor access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 5. Inject authenticated user context in response headers
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId as string);
    response.headers.set('x-user-role', userRole);

    return response;
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication session' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/affiliate/:path*',
    '/distributor/:path*',
    '/api/admin/:path*',
    '/api/distributor/:path*',
    '/api/affiliate/:path*',
    '/api/auth/me',
  ],
};
