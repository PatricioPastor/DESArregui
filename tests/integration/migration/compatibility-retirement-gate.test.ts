import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const readRepoFile = async (relativePath: string): Promise<string> => {
    return readFile(path.join(repoRoot, relativePath), "utf8");
};

describe("phase5 compatibility retirement gate", () => {
    it("guards destructive cleanup behind phase5 canonical approvals", async () => {
        const migration = await readRepoFile("prisma/migrations/20260226190000_phase5_compat_retirement/migration.sql");

        expect(migration).toContain("phones.migration_phase_gate_control");
        expect(migration).toContain("source_mode = 'canonical'");
        expect(migration).toContain("is_gate_open = true");
        expect(migration).toContain("rollout_phase = 'phase5'");
        expect(migration).toContain("expected 8 canonical/open gate records");
    });

    it("drops compatibility wrappers and legacy table family", async () => {
        const migration = await readRepoFile("prisma/migrations/20260226190000_phase5_compat_retirement/migration.sql");

        expect(migration).toContain("DROP FUNCTION IF EXISTS phones.get_enhanced_kpis_source");
        expect(migration).toContain("DROP FUNCTION IF EXISTS phones.get_enhanced_kpis_legacy");
        expect(migration).toContain("DROP FUNCTION IF EXISTS phones.get_enhanced_kpis_canonical");

        expect(migration).toContain("DROP VIEW IF EXISTS phones.shipments_n1");
        expect(migration).toContain("DROP VIEW IF EXISTS phones.assignments_n1");
        expect(migration).toContain("DROP VIEW IF EXISTS phones.device_n1");

        expect(migration).toContain("DROP TABLE IF EXISTS phones.assignment_legacy");
        expect(migration).toContain("DROP TABLE IF EXISTS phones.device_legacy");
    });
});
