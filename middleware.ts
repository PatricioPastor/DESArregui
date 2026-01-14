import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canAccessPathWithRoles, getFirstAllowedModulePath } from "./src/lib/iam/permissions";

type MeRolesResponse = {
    data?: {
        isAdmin?: boolean;
        roleNames?: string[];
        firstAllowedPath?: string | null;
    };
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const meRolesUrl = new URL("/api/iam/me/roles", request.url);

    const meRolesResponse = await fetch(meRolesUrl, {
        cache: "no-store",
        headers: {
            cookie: request.headers.get("cookie") ?? "",
        },
    });

    // Unauthenticated
    if (meRolesResponse.status === 401) {
        if (pathname.startsWith("/login")) {
            return NextResponse.next();
        }

        return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = (await meRolesResponse.json().catch(() => null)) as MeRolesResponse | null;

    const isAdmin = payload?.data?.isAdmin === true;
    const roleNames = payload?.data?.roleNames ?? [];

    if (pathname.startsWith("/login")) {
        const redirectTo = isAdmin ? "/" : (payload?.data?.firstAllowedPath ?? getFirstAllowedModulePath(roleNames) ?? "/");
        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    if (isAdmin) {
        return NextResponse.next();
    }

    const firstAllowedPath = payload?.data?.firstAllowedPath ?? getFirstAllowedModulePath(roleNames);

    // Pending page is allowed for authenticated users without roles
    if (pathname.startsWith("/iam/pending")) {
        if (roleNames.length > 0) {
            return NextResponse.redirect(new URL(firstAllowedPath ?? "/", request.url));
        }

        return NextResponse.next();
    }

    // Users without granular roles go to pending
    if (roleNames.length === 0) {
        return NextResponse.redirect(new URL("/iam/pending", request.url));
    }

    // IAM is admin-only (except /iam/pending)
    if (pathname.startsWith("/iam")) {
        return NextResponse.redirect(new URL(firstAllowedPath ?? "/", request.url));
    }

    // Root is always allowed for users with at least one role
    if (pathname === "/") {
        return NextResponse.next();
    }

    if (!canAccessPathWithRoles(pathname, roleNames)) {
        return NextResponse.redirect(new URL(firstAllowedPath ?? "/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
