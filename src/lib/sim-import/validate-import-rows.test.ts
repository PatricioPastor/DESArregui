import { describe, expect, it } from "bun:test";
import { SUPPORTED_SIM_PROVIDER, type CanonicalSimImportRow } from "@/lib/types";
import { validateImportRows } from "@/lib/sim-import/validate-import-rows";

function buildRow(overrides: Partial<CanonicalSimImportRow> = {}): CanonicalSimImportRow {
    return {
        provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
        icc: "8954042903149480001",
        ip: "10.20.30.40",
        status: "active",
        distributorName: "Edenor",
        sourceRowIndex: 2,
        sourceRecord: {},
        ...overrides,
    };
}

describe("validateImportRows", () => {
    it("keeps valid rows and normalizes output", () => {
        const result = validateImportRows([
            buildRow({
                icc: " 8954042903149480001 ",
                distributorName: "  Edenor   Norte ",
                ip: " 192.168.1.10 ",
                status: "active",
            }),
        ]);

        expect(result.errors).toHaveLength(0);
        expect(result.validRows).toHaveLength(1);
        expect(result.validRows[0]?.icc).toBe("8954042903149480001");
        expect(result.validRows[0]?.status).toBe("Activado");
        expect(result.validRows[0]?.distributorName).toBe("Edenor   Norte");
        expect(result.summary).toEqual({
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
        });
    });

    it("reports duplicate ICC and invalid IP with row-level reasons", () => {
        const duplicateIcc = "8954042903149480002";
        const result = validateImportRows([
            buildRow({ icc: duplicateIcc, sourceRowIndex: 2 }),
            buildRow({ icc: duplicateIcc, ip: "999.1.1.1", sourceRowIndex: 3 }),
        ]);

        expect(result.validRows).toHaveLength(1);
        expect(result.summary.invalidRows).toBe(1);
        expect(result.errors.some((error) => error.rowIndex === 3 && error.reason === "Duplicate ICC in import file")).toBe(true);
        expect(result.errors.some((error) => error.rowIndex === 3 && error.reason === "IP must be a valid IPv4 or IPv6 address")).toBe(true);
    });

    it("rejects unsupported providers and scientific-notation ICC artifacts", () => {
        const result = validateImportRows([
            buildRow({
                provider: "PERSONAL" as unknown as CanonicalSimImportRow["provider"],
                icc: "8.95404290314948E+18",
                sourceRowIndex: 5,
            }),
        ]);

        expect(result.validRows).toHaveLength(0);
        expect(result.summary.invalidRows).toBe(1);
        expect(result.errors.some((error) => error.reason.includes("Provider is required"))).toBe(true);
        expect(result.errors.some((error) => error.reason.includes("scientific-notation artifacts"))).toBe(true);
    });
});
