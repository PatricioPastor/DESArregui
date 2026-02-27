import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const readRepoFile = async (relativePath: string): Promise<string> => {
    return readFile(path.join(repoRoot, relativePath), "utf8");
};

describe("phase5 stock-n1 hotfix", () => {
    it("keeps stock dashboard wired to stock-n1 API route", async () => {
        const stockPage = await readRepoFile("src/app/(dashboard)/stock/page.tsx");
        const stockDashboard = await readRepoFile("src/features/stock-n1/components/stock-n1-dashboard.tsx");

        expect(stockPage).toContain("StockN1Dashboard");
        expect(stockDashboard).toContain("/api/stock-n1");
        expect(stockDashboard).toContain("mine: isMineContext");
    });

    it("requires auth/role guard for GET", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("export const GET = withRoles([\"stock-viewer\"], async");
    });

    it("uses bounded default DB pagination", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("const DEFAULT_PAGE_SIZE = 50");
        expect(stockN1Route).toContain("const MAX_PAGE_SIZE = 100");
        expect(stockN1Route).toContain("parseBoundedPositiveInt(rawLimit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)");
        expect(stockN1Route).toContain("prisma.device.count({ where: effectiveWhere })");
        expect(stockN1Route).toContain("skip,");
        expect(stockN1Route).toContain("take: limit");
        expect(stockN1Route).toContain("pagination:");
    });

    it("returns full-scope summary counters separate from paginated rows", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("summary:");
        expect(stockN1Route).toContain("assignedDevices");
        expect(stockN1Route).toContain("activeAssignments");
        expect(stockN1Route).toContain("availableDevices");
        expect(stockN1Route).toContain("newDevices");
        expect(stockN1Route).not.toContain("shippingDevices");
        expect(stockN1Route).toContain("prisma.assignment.count({");
    });

    it("uses API summary counters in stock-n1 dashboard badges", async () => {
        const stockDashboard = await readRepoFile("src/features/stock-n1/components/stock-n1-dashboard.tsx");

        expect(stockDashboard).toContain("summary?.assignedDevices");
        expect(stockDashboard).toContain("summary?.activeAssignments");
        expect(stockDashboard).toContain("summary?.newDevices");
        expect(stockDashboard).toContain("summary?.usedDevices");
        expect(stockDashboard).toContain("asignaciones activas en");
    });

    it("uses only Nuevos/Usados/Asignados quick filters", async () => {
        const stockDashboard = await readRepoFile("src/features/stock-n1/components/stock-n1-dashboard.tsx");

        expect(stockDashboard).toContain('label: "Nuevos"');
        expect(stockDashboard).toContain('label: "Usados"');
        expect(stockDashboard).toContain('label: "Asignados"');
        expect(stockDashboard).not.toContain('label: "En envío"');
    });

    it("enforces mine scope against authenticated session user", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("const sessionUserId = session.user.id");
        expect(stockN1Route).toContain("if (mine) {");
        expect(stockN1Route).toContain("baseWhere.owner_user_id = sessionUserId");
        expect(stockN1Route).toContain("if (mine && ownerId && ownerId !== sessionUserId)");
        expect(stockN1Route).toContain("owner_id no coincide con el usuario autenticado para mine=true");
        expect(stockN1Route).toContain("{ status: 403 }");
    });

    it("applies category-aware where clause for both list and pagination totals", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("const categoryFilter = normalizeCategoryValue(searchParams.get(\"category\"));");
        expect(stockN1Route).toContain("const effectiveWhere = categoryFilter ? withBaseWhere(baseWhere, resolveCategoryWhere(categoryFilter)) : baseWhere;");
        expect(stockN1Route).toContain("prisma.device.count({ where: effectiveWhere })");
        expect(stockN1Route).toContain("where: effectiveWhere,");
    });

    it("supports exact imei filter scope and does not leak unrelated rows", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("if (imei) {");
        expect(stockN1Route).toContain("baseWhere.imei = {");
        expect(stockN1Route).toContain("equals: imei");
        expect(stockN1Route).toContain("mode: \"insensitive\"");
        expect(stockN1Route).toContain("baseWhere.OR = [");
    });

    it("resets pagination when category or imei/search input changes", async () => {
        const stockDashboard = await readRepoFile("src/features/stock-n1/components/stock-n1-dashboard.tsx");

        expect(stockDashboard).toContain("setPage(1);");
        expect(stockDashboard).toContain("[debouncedSearch, sidebarCategory, mainContext, ownerFilterId]");
    });

    it("blocks mine=true when owner column is missing", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("if (mine && !deviceColumns.has(\"owner_user_id\"))");
        expect(stockN1Route).toContain("phones.device.owner_user_id");
        expect(stockN1Route).toContain("status: 503");
    });

    it("adds schema drift observability header for missing columns", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("x-stock-n1-fallback-column");
        expect(stockN1Route).toContain("extractMissingColumn");
    });

    it("returns UI-compatible inventory contract fields", async () => {
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockN1Route).toContain("model_details");
        expect(stockN1Route).toContain("owner_name");
        expect(stockN1Route).toContain("owner_image");
        expect(stockN1Route).toContain("status_label");
        expect(stockN1Route).toContain("asignado_a");
        expect(stockN1Route).toContain("raw:");
        expect(stockN1Route).toContain("assignments,");
    });
});
