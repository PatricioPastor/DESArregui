import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const readRepoFile = async (relativePath: string): Promise<string> => {
    return readFile(path.join(repoRoot, relativePath), "utf8");
};

describe("phase5 remediation batch2", () => {
    it("moves stock and model surfaces away from n1 delegates", async () => {
        const files = [
            "src/app/api/stock/route.ts",
            "src/app/api/stock/[imei]/route.ts",
            "src/app/api/models/[id]/route.ts",
            "src/lib/stock-detail.ts",
        ];

        for (const file of files) {
            const content = await readRepoFile(file);
            expect(content).not.toMatch(/\bprisma\.device_n1\./);
            expect(content).not.toMatch(/\btx\.device_n1\./);
            expect(content).not.toMatch(/\bprisma\.assignment_n1\./);
            expect(content).not.toMatch(/\btx\.assignment_n1\./);
        }
    });

    it("keeps canonical delegates explicit in migrated stock surfaces", async () => {
        const stockRoute = await readRepoFile("src/app/api/stock/route.ts");
        const stockByImeiRoute = await readRepoFile("src/app/api/stock/[imei]/route.ts");
        const stockDetailLib = await readRepoFile("src/lib/stock-detail.ts");

        expect(stockRoute).toContain("prisma.device.findMany");
        expect(stockRoute).toContain("prisma.device.create");
        expect(stockRoute).toContain("prisma.assignment.create");
        expect(stockByImeiRoute).toContain("prisma.device.update");
        expect(stockDetailLib).toContain("prisma.device.findUnique");
    });
});
