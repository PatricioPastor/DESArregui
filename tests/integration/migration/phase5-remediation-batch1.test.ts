import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const readRepoFile = async (relativePath: string): Promise<string> => {
    return readFile(path.join(repoRoot, relativePath), "utf8");
};

describe("phase5 remediation batch1", () => {
    it("moves assignments routes away from n1 delegates", async () => {
        const files = [
            "src/app/api/assignments/route.ts",
            "src/app/api/assignments/[id]/close/route.ts",
            "src/app/api/assignments/[id]/return/route.ts",
            "src/app/api/assignments/[id]/shipping/route.ts",
            "src/app/api/assignments/[id]/shipping/start/route.ts",
            "src/app/api/assignments/[id]/shipping/deliver/route.ts",
        ];

        for (const file of files) {
            const content = await readRepoFile(file);
            expect(content).not.toMatch(/\bprisma\.assignment_n1\./);
            expect(content).not.toMatch(/\btx\.assignment_n1\./);
            expect(content).not.toMatch(/\bprisma\.device_n1\./);
            expect(content).not.toMatch(/\btx\.device_n1\./);
        }
    });

    it("does not reference retired device_legacy runtime sources", async () => {
        const assignmentsRoute = await readRepoFile("src/app/api/assignments/route.ts");

        expect(assignmentsRoute).not.toContain("phones.device_legacy");
        expect(assignmentsRoute).not.toContain('phones."device_legacy"');
        expect(assignmentsRoute).not.toContain("legacyRows");
    });

    it("keeps reports routes on canonical compatibility contracts", async () => {
        const kpisRoute = await readRepoFile("src/app/api/reports/kpis/route.ts");
        const reportsSummaryRoute = await readRepoFile("src/app/api/reports/phones/summary/route.ts");

        expect(kpisRoute).not.toContain("prisma.device_n1.groupBy");
        expect(kpisRoute).not.toContain("prisma.device_n1.count");
        expect(reportsSummaryRoute).not.toContain("get_enhanced_kpis_legacy");
        expect(reportsSummaryRoute).not.toContain("get_enhanced_kpis_canonical");
        expect(reportsSummaryRoute).toContain("phones.get_enhanced_kpis(");
    });
});
