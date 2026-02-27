import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const readRepoFile = async (relativePath: string): Promise<string> => {
    return readFile(path.join(repoRoot, relativePath), "utf8");
};

describe("phase4 canonical cutover smoke", () => {
    it("implements idempotent canonical rename and compatibility views", async () => {
        const migration = await readRepoFile("prisma/migrations/20260226150000_phase3_canonical_table_rename/migration.sql");

        expect(migration).toContain("v_device_legacy_relkind");
        expect(migration).toContain("v_assignment_legacy_relkind");
        expect(migration).toContain("EXECUTE 'ALTER TABLE phones.device RENAME TO device_legacy'");
        expect(migration).toContain("EXECUTE 'ALTER TABLE phones.assignment RENAME TO assignment_legacy'");
        expect(migration).toContain("EXECUTE 'ALTER TABLE phones.device_n1 RENAME TO device'");
        expect(migration).toContain("EXECUTE 'ALTER TABLE phones.assignments_n1 RENAME TO assignment'");
        expect(migration).toContain("EXECUTE 'ALTER TABLE phones.shipments_n1 RENAME TO shipment'");

        expect(migration).toContain("CREATE OR REPLACE VIEW phones.device_n1 AS");
        expect(migration).toContain("CREATE OR REPLACE VIEW phones.assignments_n1 AS");
        expect(migration).toContain("CREATE OR REPLACE VIEW phones.shipments_n1 AS");

        expect(migration).toContain("CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_legacy");
        expect(migration).toContain("CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_canonical");
        expect(migration).toContain("CREATE OR REPLACE FUNCTION phones.get_enhanced_kpis_source");
    });

    it("keeps compatibility window objects available for rollback", async () => {
        const migration = await readRepoFile("prisma/migrations/20260226150000_phase3_canonical_table_rename/migration.sql");

        expect(migration).not.toContain("DROP VIEW phones.device_n1");
        expect(migration).not.toContain("DROP VIEW phones.assignments_n1");
        expect(migration).not.toContain("DROP VIEW phones.shipments_n1");
        expect(migration).not.toContain("DROP TABLE phones.device_legacy");
        expect(migration).not.toContain("DROP TABLE phones.assignment_legacy");
    });

    it("aligns Prisma mappings to post-phase5 canonical names", async () => {
        const schema = await readRepoFile("prisma/schema.prisma");

        expect(schema).toContain("model device {");
        expect(schema).toContain("@@map(\"device\")");

        expect(schema).toContain("model assignment {");
        expect(schema).toContain("@@map(\"assignment\")");

        expect(schema).toContain("model shipment {");
        expect(schema).toContain("@@map(\"shipment\")");

        expect(schema).not.toContain("model device_n1 {");
        expect(schema).not.toContain("model assignment_n1 {");
        expect(schema).not.toContain("model shipment_n1 {");
        expect(schema).not.toContain("@@map(\"device_legacy\")");
        expect(schema).not.toContain("@@map(\"assignment_legacy\")");
    });

    it("keeps route contracts stable while using canonical internals", async () => {
        const reportsSummaryRoute = await readRepoFile("src/app/api/reports/phones/summary/route.ts");
        const kpisRoute = await readRepoFile("src/app/api/reports/kpis/route.ts");
        const distributorsRoute = await readRepoFile("src/app/api/distributors/route.ts");
        const assignmentsRoute = await readRepoFile("src/app/api/assignments/route.ts");

        expect(reportsSummaryRoute).toContain("x-migration-source-mode");
        expect(kpisRoute).toContain("x-migration-source-mode");
        expect(distributorsRoute).toContain("x-migration-source-mode");
        expect(assignmentsRoute).toContain("prisma.shipment.count");
        expect(assignmentsRoute).toContain("x-migration-source-mode");
    });
});
