import { describe, expect, it } from "bun:test";
import { evaluateParity } from "../../../src/lib/migration-parity";
import {
    toDistributorParitySnapshot,
    toHomeShippingParitySnapshot,
    toHomeStockParitySnapshot,
    toKpiParitySnapshot,
    toReportsPhonesParitySnapshot,
} from "../../../src/lib/migration-surface-parity";

describe("migration parity windows", () => {
    it("validates reports phones chart/forecast/top widgets parity", () => {
        const legacySnapshot = toReportsPhonesParitySnapshot({
            kpis: {
                total_tickets: 100,
                total_demand: 120,
                pending_demand: 10,
                assignments: 60,
                replacements: 40,
                replacement_rate: 40,
            },
            stock: {
                available: 80,
            },
            monthly_data: [
                { tickets: 30, demand: 36, is_projected: false, projected_demand: null },
                { tickets: 32, demand: 38, is_projected: false, projected_demand: null },
                { tickets: 38, demand: 46, is_projected: true, projected_demand: 45 },
            ],
        });

        const canonicalSnapshot = toReportsPhonesParitySnapshot({
            kpis: {
                total_tickets: 101,
                total_demand: 121,
                pending_demand: 10,
                assignments: 60,
                replacements: 40,
                replacement_rate: 40,
            },
            stock: {
                available: 81,
            },
            monthly_data: [
                { tickets: 30, demand: 36, is_projected: false, projected_demand: null },
                { tickets: 33, demand: 39, is_projected: false, projected_demand: null },
                { tickets: 38, demand: 46, is_projected: true, projected_demand: 45 },
            ],
        });

        const result = evaluateParity({
            surface: "reports_phones",
            thresholdProfile: "reports",
            baseline: legacySnapshot,
            candidate: canonicalSnapshot,
            periodStart: "2025-04-01",
            periodEnd: "2025-06-30",
        });

        expect(result.evidence.passed).toBe(true);
        expect(result.failedMetrics).toEqual([]);
    });

    it("validates KPI and home stock/shipping parity windows", () => {
        const kpiParity = evaluateParity({
            surface: "home_kpis",
            thresholdProfile: "home",
            baseline: toKpiParitySnapshot({
                requests: 200,
                requests_pending: 20,
                replacements: 80,
                assignments: 120,
                stock_current: 500,
                total_devices: 700,
                devices_lost: 12,
                utilization_rate: 71.4,
                replacement_rate: 40,
            }),
            candidate: toKpiParitySnapshot({
                requests: 200,
                requests_pending: 20,
                replacements: 80,
                assignments: 120,
                stock_current: 501,
                total_devices: 701,
                devices_lost: 12,
                utilization_rate: 71.5,
                replacement_rate: 40,
            }),
        });

        const stockParity = evaluateParity({
            surface: "home_stock",
            thresholdProfile: "home",
            baseline: toHomeStockParitySnapshot(700),
            candidate: toHomeStockParitySnapshot(704),
        });

        const shippingParity = evaluateParity({
            surface: "home_shipping",
            thresholdProfile: "home",
            baseline: toHomeShippingParitySnapshot(35),
            candidate: toHomeShippingParitySnapshot(34),
        });

        expect(kpiParity.evidence.passed).toBe(true);
        expect(stockParity.evidence.passed).toBe(true);
        expect(shippingParity.evidence.passed).toBe(false);
        expect(shippingParity.failedMetrics).toContain("shipping_in_progress");
    });

    it("validates distributor aggregate parity windows", () => {
        const legacy = toDistributorParitySnapshot([
            { name: "Alpha Distribuidora", deviceCount: 100 },
            { name: "Beta Distribuidora", deviceCount: 80 },
        ]);

        const canonical = toDistributorParitySnapshot([
            { name: "Alpha Distribuidora", deviceCount: 100 },
            { name: "Beta Distribuidora", deviceCount: 79 },
        ]);

        const result = evaluateParity({
            surface: "distributors",
            thresholdProfile: "distributors",
            baseline: legacy,
            candidate: canonical,
        });

        expect(result.evidence.passed).toBe(false);
        expect(result.failedMetrics).toContain("distributor_beta_distribuidora");
    });
});
