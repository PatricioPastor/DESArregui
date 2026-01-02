import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserRole, isAdmin } from '@/utils/user-roles';

/**
 * Type for better-auth session
 * Includes user and session objects
 */
type Session = typeof auth.$Infer.Session;

/**
 * Helper to get session from server-side request
 *
 * Usage: const session = await getServerSession(request);
 *
 * @param request - Next.js request object
 * @returns Session or null if not authenticated
 */
export async function getServerSession(request: NextRequest): Promise<Session | null> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers // ✅ Correct for API routes
    });

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Higher-order function to protect API routes with authentication
 *
 * The handler receives (request, session, ...args) where session is guaranteed to exist.
 *
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (request, session) => {
 *   // session.user is available here
 *   return NextResponse.json({ user: session.user });
 * });
 * ```
 *
 * @param handler - Route handler function that requires authentication
 * @returns Protected route handler
 */
export function withAuth(
  handler: (request: NextRequest, session: Session, ...args: any[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required to access this resource'
        },
        { status: 401 }
      );
    }

    return handler(request, session, ...args);
  };
}

/**
 * Higher-order function to protect API routes for admin-only access
 *
 * Validates both authentication AND admin role.
 *
 * Usage:
 * ```typescript
 * export const POST = withAdminOnly(async (request, session) => {
 *   // Only admins reach here
 *   await dangerousOperation();
 *   return NextResponse.json({ success: true });
 * });
 * ```
 *
 * @param handler - Route handler function that requires admin access
 * @returns Protected route handler
 */
export function withAdminOnly(
  handler: (request: NextRequest, session: Session, ...args: any[]) => Promise<Response>
) {
  return withAuth(async (request: NextRequest, session: Session, ...args: any[]) => {
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Admin access required for this operation'
        },
        { status: 403 }
      );
    }

    return handler(request, session, ...args);
  });
}

/**
 * Higher-order function to protect API routes with role-based access control
 *
 * Validates authentication and checks if user has one of the allowed roles.
 *
 * Usage:
 * ```typescript
 * export const GET = withRoles(['admin', 'sims-viewer'], async (request, session) => {
 *   // Only users with admin or sims-viewer role reach here
 *   return NextResponse.json({ data: sensitiveSIMSData });
 * });
 * ```
 *
 * @param allowedRoles - Array of role names that can access this route
 * @param handler - Route handler function
 * @returns Protected route handler
 */
export function withRoles(
  allowedRoles: string[],
  handler: (request: NextRequest, session: Session, ...args: any[]) => Promise<Response>
) {
  return withAuth(async (request: NextRequest, session: Session, ...args: any[]) => {
    const userRole = getUserRole(session.user.email);

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        },
        { status: 403 }
      );
    }

    return handler(request, session, ...args);
  });
}

/**
 * Validates authentication and throws if not authenticated
 *
 * Useful for try/catch patterns where you want to handle auth errors differently.
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   try {
 *     const session = await requireAuth(request);
 *     // session is guaranteed here
 *   } catch (error) {
 *     // Handle UNAUTHORIZED error
 *   }
 * }
 * ```
 *
 * @param request - Next.js request object
 * @returns Session if authenticated
 * @throws Error with message 'UNAUTHORIZED' if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<Session> {
  const session = await getServerSession(request);

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}

/**
 * Validates admin access and throws if not admin
 *
 * Useful for inline validation within route handlers.
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const session = await requireAuth(request);
 *   requireAdmin(session); // Throws if not admin
 *   await dangerousOperation();
 * }
 * ```
 *
 * @param session - BetterAuth session object
 * @throws Error with message 'FORBIDDEN' if not admin
 */
export function requireAdmin(session: Session): void {
  if (!isAdmin(session.user.email)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Validates role access and throws if user doesn't have required role
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const session = await requireAuth(request);
 *   requireRole(session, ['admin', 'sims-viewer']);
 *   return NextResponse.json({ data: simsData });
 * }
 * ```
 *
 * @param session - BetterAuth session object
 * @param allowedRoles - Array of allowed role names
 * @throws Error with message 'FORBIDDEN' if user doesn't have required role
 */
export function requireRole(session: Session, allowedRoles: string[]): void {
  const userRole = getUserRole(session.user.email);

  if (!allowedRoles.includes(userRole)) {
    throw new Error('FORBIDDEN');
  }
}
