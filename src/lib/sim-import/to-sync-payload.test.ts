import { describe, expect, it } from "bun:test";
import { SUPPORTED_SIM_PROVIDER, type CanonicalSimImportRow } from "@/lib/types";
import { buildSimSyncPayload } from "@/lib/sim-import/to-sync-payload";

function buildRow(overrides: Partial<CanonicalSimImportRow> = {}): CanonicalSimImportRow {
    return {
        provider: SUPPORTED_SIM_PROVIDER.CLARO,
        icc: "8954042903149480003",
        ip: null,
        status: "inactive",
        distributorName: "Edesur",
        sourceRowIndex: 7,
        sourceRecord: {},
        ...overrides,
    };
}

describe("buildSimSyncPayload", () => {
    it("maps canonical rows to legacy sync payload", () => {
        const payload = buildSimSyncPayload([
            buildRow({
                provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
                ip: " 10.0.0.5 ",
                status: "active",
                distributorName: " Edenor ",
            }),
        ]);

        expect(payload).toEqual([
            {
                ICC: "8954042903149480003",
                IP: "10.0.0.5",
                Estado: "Activado",
                Empresa: "MOVISTAR (Edenor)",
            },
        ]);
    });

    it("throws if row provider is unsupported", () => {
        expect(() =>
            buildSimSyncPayload([
                buildRow({
                    provider: "PERSONAL" as unknown as CanonicalSimImportRow["provider"],
                }),
            ]),
        ).toThrow("Only MOVISTAR and CLARO are supported");
    });

    it("throws if distributor name is blank", () => {
        expect(() =>
            buildSimSyncPayload([
                buildRow({
                    distributorName: "   ",
                }),
            ]),
        ).toThrow("Distributor name is required");
    });
});
