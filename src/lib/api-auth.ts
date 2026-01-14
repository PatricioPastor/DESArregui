import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Type for better-auth session
 * Includes user and session objects
 */
type Session = typeof auth.$Infer.Session;

const isAdminSession = (session: Session): boolean => {
    return session.user.role === "admin";
};

const getGranularRoleNames = async (userId: string): Promise<string[]> => {
    const assignments = await prisma.userAuthRole.findMany({
        where: {
            userId,
        },
        select: {
            role: {
                select: {
                    name: true,
                },
            },
        },
    });

    return assignments.map((row) => row.role.name);
};

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
            headers: request.headers,
        });

        return session;
    } catch (error) {
        console.error("Error getting session:", error);
        return null;
    }
}

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(handler: (request: NextRequest, session: Session, ...args: any[]) => Promise<Response>) {
    return async (request: NextRequest, ...args: any[]) => {
        const session = await getServerSession(request);

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                    message: "Authentication required to access this resource",
                },
                { status: 401 },
            );
        }

        return handler(request, session, ...args);
    };
}

/**
 * Higher-order function to protect API routes for admin-only access
 */
export function withAdminOnly(handler: (request: NextRequest, session: Session, ...args: any[]) => Promise<Response>) {
    return withAuth(async (request: NextRequest, session: Session, ...args: any[]) => {
        if (!isAdminSession(session)) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                    message: "Admin access required for this operation",
                },
                { status: 403 },
            );
        }

        return handler(request, session, ...args);
    });
}

/**
 * Higher-order function to protect API routes with granular role-based access control.
 *
 * Note: Better Auth admin role (session.user.role === 'admin') always bypasses.
 */
export function withRoles(allowedRoles: string[], handler: (request: NextRequest, session: Session, ...args: any[]) => Promise<Response>) {
    return withAuth(async (request: NextRequest, session: Session, ...args: any[]) => {
        if (isAdminSession(session)) {
            return handler(request, session, ...args);
        }

        const roleNames = await getGranularRoleNames(session.user.id);

        if (!allowedRoles.some((role) => roleNames.includes(role))) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                    message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
                },
                { status: 403 },
            );
        }

        return handler(request, session, ...args);
    });
}

/**
 * Validates authentication and throws if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<Session> {
    const session = await getServerSession(request);

    if (!session) {
        throw new Error("UNAUTHORIZED");
    }

    return session;
}

/**
 * Validates admin access and throws if not admin
 */
export function requireAdmin(session: Session): void {
    if (!isAdminSession(session)) {
        throw new Error("FORBIDDEN");
    }
}

/**
 * Validates granular role access and throws if user doesn't have required role.
 */
export async function requireRole(session: Session, allowedRoles: string[]): Promise<void> {
    if (isAdminSession(session)) {
        return;
    }

    const roleNames = await getGranularRoleNames(session.user.id);

    if (!allowedRoles.some((role) => roleNames.includes(role))) {
        throw new Error("FORBIDDEN");
    }
}
