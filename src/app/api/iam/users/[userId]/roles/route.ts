import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { withAdminOnly } from "@/lib/api-auth";
import { handleAPIError, validationError } from "@/lib/api-errors";

type RouteParams = {
    userId: string;
};

export const GET = withAdminOnly(async (_request: NextRequest, _session, context: { params: Promise<RouteParams> }) => {
    try {
        const { userId } = await context.params;

        if (!userId) {
            throw validationError("userId requerido");
        }

        const assigned = await prisma.userAuthRole.findMany({
            where: {
                userId,
            },
            include: {
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        const roleNames = assigned.map((row) => row.role.name);

        return NextResponse.json({
            data: {
                userId,
                roleNames,
            },
        });
    } catch (error) {
        return handleAPIError(error);
    }
});

export const PUT = withAdminOnly(async (request: NextRequest, _session, context: { params: Promise<RouteParams> }) => {
    try {
        const { userId } = await context.params;

        if (!userId) {
            throw validationError("userId requerido");
        }

        const body = (await request.json().catch(() => null)) as unknown;
        const roleNames = (body as any)?.roleNames as unknown;

        if (!Array.isArray(roleNames) || roleNames.some((role) => typeof role !== "string")) {
            throw validationError("roleNames debe ser string[]");
        }

        const normalizedRoleNames = Array.from(
            new Set(
                roleNames
                    .map((role) => role.trim())
                    .filter(Boolean),
            ),
        );

        const roles = await prisma.authRole.findMany({
            where: {
                name: {
                    in: normalizedRoleNames,
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (roles.length !== normalizedRoleNames.length) {
            const found = new Set(roles.map((r) => r.name));
            const missing = normalizedRoleNames.filter((name) => !found.has(name));
            throw validationError(`Roles inválidos: ${missing.join(", ")}`);
        }

        await prisma.$transaction([
            prisma.userAuthRole.deleteMany({
                where: {
                    userId,
                },
            }),
            prisma.userAuthRole.createMany({
                data: roles.map((role) => ({
                    userId,
                    roleId: role.id,
                })),
                skipDuplicates: true,
            }),
        ]);

        return NextResponse.json({
            data: {
                userId,
                roleNames: roles.map((r) => r.name).sort((a, b) => a.localeCompare(b, "es")),
            },
        });
    } catch (error) {
        return handleAPIError(error);
    }
});
