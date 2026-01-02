import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/utils/user-roles';

/**
 * Global middleware for route protection and inactive user redirection
 *
 * Protects:
 * - All /api/* routes (except /api/auth and /api/_legacy)
 * - All dashboard routes (/)
 *
 * Validates session and checks if user is active (isActive: true)
 * Redirects inactive users to /pending-activation
 *
 * @see https://www.better-auth.com/docs/integrations/next
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/pending-activation'];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Skip auth routes - BetterAuth handles these
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Skip legacy routes (will be deleted soon)
  if (pathname.startsWith('/api/_legacy')) {
    return NextResponse.next();
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers() // ✅ Correct for Next.js 15.2.0+
    });

    // No session = unauthorized
    if (!session) {
      // For API routes, return JSON error
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Authentication required to access this resource'
          },
          { status: 401 }
        );
      }

      // For page routes, redirect to sign-in (handled by better-auth)
      return NextResponse.next();
    }

    // Check if user is active
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isActive: true },
    });

    // User not active - redirect to pending activation page
    if (user && !user.isActive) {
      // For API routes, return JSON error
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Your account is pending activation. Please contact an administrator.'
          },
          { status: 403 }
        );
      }

      // For page routes, redirect to pending activation
      const url = request.nextUrl.clone();
      url.pathname = '/pending-activation';
      return NextResponse.redirect(url);
    }

    // Check admin routes - only admins can access
    if (pathname.startsWith('/admin')) {
      if (!isAdmin(session.user.email)) {
        // For API routes, return JSON error
        if (pathname.startsWith('/api')) {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'Admin access required for this resource'
            },
            { status: 403 }
          );
        }

        // For page routes, redirect to home
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }

    // Session is valid and user is active, continue
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware auth error:', error);

    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        {
          error: 'Authentication Error',
          message: 'Failed to validate session'
        },
        { status: 500 }
      );
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
