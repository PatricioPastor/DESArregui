import { describe, expect, it } from "bun:test";
import { resolveSimImportAdapter } from "@/lib/sim-import/adapter-registry";
import { claroXlsxAdapter } from "@/lib/sim-import/adapters/claro-adapter";
import { movistarCsvAdapter } from "@/lib/sim-import/adapters/movistar-adapter";
import { SUPPORTED_SIM_PROVIDER } from "@/lib/types";

describe("provider adapters", () => {
    it("extracts MOVISTAR rows from alias headers and wrapped values", () => {
        const output = movistarCsvAdapter.extractRows([
            {
                iccid: '="8954042903149480004"',
                customerName: ' " Edenor " ',
                lte_status: "active",
                currentIp: '="10.20.30.40"',
            },
        ]);

        expect(output.errors).toHaveLength(0);
        expect(output.rows).toHaveLength(1);
        expect(output.rows[0]).toMatchObject({
            provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
            icc: "8954042903149480004",
            distributorName: "Edenor",
            ip: "10.20.30.40",
            status: "Activado",
            sourceRowIndex: 2,
        });
    });

    it("extracts CLARO rows from fallback accentless headers", () => {
        const output = claroXlsxAdapter.extractRows([
            {
                ICC: "8954042903149480005",
                "Direcci n IP": "2001:db8::1",
                Estado: "inactive",
                "Plan de comunicaci n": "EDESUR",
            },
        ]);

        expect(output.errors).toHaveLength(0);
        expect(output.rows).toHaveLength(1);
        expect(output.rows[0]).toMatchObject({
            provider: SUPPORTED_SIM_PROVIDER.CLARO,
            icc: "8954042903149480005",
            distributorName: "EDESUR",
            ip: "2001:db8::1",
            status: "Desactivado",
            sourceRowIndex: 2,
        });
    });

    it("fails safely when provider is missing or unsupported", () => {
        expect(() => resolveSimImportAdapter(null)).toThrow("Only MOVISTAR and CLARO are supported");
        expect(() => resolveSimImportAdapter("PERSONAL")).toThrow("Only MOVISTAR and CLARO are supported");
    });
});
