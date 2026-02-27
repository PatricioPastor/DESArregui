import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const readRepoFile = async (relativePath: string): Promise<string> => {
    return readFile(path.join(repoRoot, relativePath), "utf8");
};

describe("phase2 purchase decommission", () => {
    it("removes purchase model and linked columns from Prisma schema", async () => {
        const schema = await readRepoFile("prisma/schema.prisma");

        expect(schema).not.toContain("model purchase {");
        expect(schema).not.toContain("purchase_id");
        expect(schema).not.toMatch(/\bpurchases\s+purchase\[\]/);
    });

    it("removes purchase linkage handling from stock API routes", async () => {
        const stockRoute = await readRepoFile("src/app/api/stock/route.ts");
        const stockByImeiRoute = await readRepoFile("src/app/api/stock/[imei]/route.ts");
        const stockN1Route = await readRepoFile("src/app/api/stock-n1/route.ts");

        expect(stockRoute).toContain("export const POST");
        expect(stockN1Route).toContain("export const POST");
        expect(stockByImeiRoute).toContain("export const PUT");

        expect(stockRoute).not.toContain("purchase_id");
        expect(stockRoute).not.toContain("prisma.purchase");
        expect(stockByImeiRoute).not.toContain("purchase_id");
        expect(stockByImeiRoute).not.toContain("prisma.purchase");
        expect(stockN1Route).not.toContain("purchase_id");
        expect(stockN1Route).not.toContain("prisma.purchase");
    });

    it("removes purchase coupling from store, detail helper, and dashboard detail UI", async () => {
        const createStockStore = await readRepoFile("src/store/create-stock.store.ts");
        const stockDetail = await readRepoFile("src/lib/stock-detail.ts");
        const deviceDetailClient = await readRepoFile("src/app/(dashboard)/stock/[imei]/device-detail.client.tsx");

        expect(createStockStore).not.toContain("purchase_id");
        expect(stockDetail).not.toContain("purchase:");
        expect(stockDetail).not.toContain("device.purchase");
        expect(deviceDetailClient).not.toContain("Compra");
        expect(deviceDetailClient).not.toContain("purchase");
    });

    it("keeps migration guarded before dropping phones.purchase", async () => {
        const migration = await readRepoFile("prisma/migrations/20260226133000_phase2_purchase_decommission/migration.sql");

        expect(migration).toContain("purchase decommission blocked");
        expect(migration).toContain("ALTER TABLE IF EXISTS phones.device");
        expect(migration).toContain("ALTER TABLE IF EXISTS phones.device_n1");
        expect(migration).toContain("DROP COLUMN IF EXISTS purchase_id");
        expect(migration).toContain("DROP TABLE IF EXISTS phones.purchase");
    });
});
