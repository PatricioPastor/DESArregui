import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
    adapter,
});

type SeedUserRoleAssignment = {
    email: string;
    roles: string[];
};

function normalizeGranularRoleName(roleName: string): string {
    const trimmed = roleName.trim();

    // Back-compat: previously we used "viewer".
    if (trimmed === "viewer") {
        return "report-viewer";
    }

    return trimmed;
}

function parseAssignmentsEnv(): SeedUserRoleAssignment[] {
    const raw = process.env.SEED_USER_ROLES;
    if (!raw) return [];

    const trimmed = raw.trim();

    // Supports either JSON:
    //   [{"email":"a@b.com","roles":["report-viewer","sims-viewer"]}]
    // Or a simpler format (easier on Windows shells):
    //   a@b.com=report-viewer,sims-viewer;other@b.com=report-viewer
    if (trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed) as unknown;
        if (!Array.isArray(parsed)) {
            throw new Error("SEED_USER_ROLES must be a JSON array");
        }

        return parsed.map((entry) => {
            if (!entry || typeof entry !== "object") {
                throw new Error("SEED_USER_ROLES entries must be objects");
            }

            const email = (entry as any).email;
            const roles = (entry as any).roles;

            if (typeof email !== "string" || !email.includes("@")) {
                throw new Error("SEED_USER_ROLES entry.email must be a valid string");
            }
            if (!Array.isArray(roles) || roles.some((r) => typeof r !== "string")) {
                throw new Error("SEED_USER_ROLES entry.roles must be string[]");
            }

            return { email, roles: roles.map(normalizeGranularRoleName) };
        });
    }

    return trimmed
        .split(";")
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => {
            const [emailRaw, rolesRaw] = chunk.split("=");
            const email = (emailRaw || "").trim();
            const roles = (rolesRaw || "")
                .split(",")
                .map((r) => normalizeGranularRoleName(r))
                .filter(Boolean);

            if (!email || !email.includes("@")) {
                throw new Error("SEED_USER_ROLES must include email=role1,role2");
            }

            return { email, roles };
        });
}

async function main() {
    const baseRoles = [
        { name: "report-viewer", label: "Reportes" },
        { name: "sims-viewer", label: "SIMS" },
        { name: "stock-viewer", label: "Stock" },
    ] as const;

    // Back-compat migration: rename old "viewer" role to "report-viewer" if needed.
    await prisma.$transaction(async (tx) => {
        const legacyViewer = await tx.authRole.findUnique({
            where: { name: "viewer" },
            select: { id: true },
        });

        const reportViewer = await tx.authRole.findUnique({
            where: { name: "report-viewer" },
            select: { id: true },
        });

        if (legacyViewer && !reportViewer) {
            await tx.authRole.update({
                where: { id: legacyViewer.id },
                data: { name: "report-viewer", label: "Reportes" },
            });
        }
    });

    const roleRows = await Promise.all(
        baseRoles.map((role) =>
            prisma.authRole.upsert({
                where: { name: role.name },
                update: {
                    label: role.label,
                },
                create: {
                    name: role.name,
                    label: role.label,
                },
            }),
        ),
    );

    const roleIdByName = new Map(roleRows.map((role) => [role.name, role.id] as const));

    const assignments = parseAssignmentsEnv();
    for (const assignment of assignments) {
        const user = await prisma.user.findUnique({
            where: { email: assignment.email },
            select: { id: true, email: true },
        });

        if (!user) {
            throw new Error(`User not found for email: ${assignment.email}`);
        }

        const joinRows = assignment.roles.map((roleName) => {
            const roleId = roleIdByName.get(roleName);
            if (!roleId) {
                throw new Error(`Role not found (did you add it to baseRoles?): ${roleName}`);
            }

            return {
                userId: user.id,
                roleId,
            };
        });

        await prisma.userAuthRole.createMany({
            data: joinRows,
            skipDuplicates: true,
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
