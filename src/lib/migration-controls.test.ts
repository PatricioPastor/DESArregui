import { describe, expect, it } from "bun:test";
import { evaluateParity } from "@/lib/migration-parity";
import { resolveSourceMode } from "@/lib/migration-source-mode";

describe("resolveSourceMode", () => {
    it("defaults to legacy when no override is set", () => {
        delete process.env.MIGRATION_SOURCE_MODE;
        delete process.env.MIGRATION_SOURCE_MODE_REPORTS_KPIS;

        expect(resolveSourceMode("reports_kpis")).toBe("legacy");
    });

    it("prioritizes explicit per-surface env override", () => {
        process.env.MIGRATION_SOURCE_MODE = "legacy";
        process.env.MIGRATION_SOURCE_MODE_REPORTS_KPIS = "canonical";

        expect(resolveSourceMode("reports_kpis")).toBe("canonical");

        delete process.env.MIGRATION_SOURCE_MODE;
        delete process.env.MIGRATION_SOURCE_MODE_REPORTS_KPIS;
    });
});

describe("evaluateParity", () => {
    it("passes when all metric deltas are inside threshold", () => {
        const result = evaluateParity({
            surface: "reports_kpis",
            thresholdProfile: "kpis",
            baseline: { requests: 100, stock_current: 50 },
            candidate: { requests: 100, stock_current: 50 },
        });

        expect(result.evidence.passed).toBe(true);
        expect(result.failedMetrics).toEqual([]);
        expect(result.evidence.deltaPct.requests).toBe(0);
    });

    it("fails when one metric exceeds threshold", () => {
        const result = evaluateParity({
            surface: "reports_kpis",
            thresholdProfile: "kpis",
            baseline: { requests: 100 },
            candidate: { requests: 120 },
        });

        expect(result.evidence.passed).toBe(false);
        expect(result.failedMetrics).toContain("requests");
        expect(result.evidence.delta.requests).toBe(20);
    });
});
