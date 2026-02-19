import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (_request: NextRequest) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                roles: {
                    some: {
                        role: {
                            name: "stock-viewer",
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: [{ name: "asc" }, { email: "asc" }],
        });

        return NextResponse.json({
            success: true,
            data: users,
            totalRecords: users.length,
        });
    } catch (error) {
        console.error("GET /api/stock/users error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
