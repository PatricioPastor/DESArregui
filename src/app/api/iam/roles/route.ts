import { NextRequest, NextResponse } from "next/server";
import { withAdminOnly } from "@/lib/api-auth";
import { handleAPIError } from "@/lib/api-errors";
import prisma from "@/lib/prisma";

export const GET = withAdminOnly(async (_request: NextRequest) => {
    try {
        const roles = await prisma.authRole.findMany({
            select: {
                id: true,
                name: true,
                label: true,
                description: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({
            data: roles,
        });
    } catch (error) {
        return handleAPIError(error);
    }
});
