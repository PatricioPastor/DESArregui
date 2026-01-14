import { NextRequest, NextResponse } from "next/server";
import { handleAPIError } from "@/lib/api-errors";
import { auth } from "@/lib/auth";
import { getFirstAllowedModulePath } from "@/lib/iam/permissions";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                    message: "Authentication required to access this resource",
                },
                { status: 401 },
            );
        }

        const isAdmin = session.user.role === "admin";

        if (isAdmin) {
            return NextResponse.json({
                data: {
                    isAdmin: true,
                    roles: [],
                    roleNames: [],
                    firstAllowedPath: "/stock",
                },
            });
        }

        const assignments = await prisma.userAuthRole.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                role: {
                    select: {
                        name: true,
                        label: true,
                    },
                },
            },
        });

        const roles = assignments.map((row) => ({
            name: row.role.name,
            label: row.role.label || row.role.name,
        }));

        const roleNames = roles.map((role) => role.name);

        return NextResponse.json({
            data: {
                isAdmin: false,
                roles,
                roleNames,
                firstAllowedPath: getFirstAllowedModulePath(roleNames),
            },
        });
    } catch (error) {
        return handleAPIError(error);
    }
}
