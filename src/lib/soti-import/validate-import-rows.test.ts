import { describe, expect, it } from "bun:test";
import { validateSotiImportRows } from "@/lib/soti-import";
import type { CanonicalSotiImportRow } from "@/lib/types";

function buildRow(overrides: Partial<CanonicalSotiImportRow> = {}): CanonicalSotiImportRow {
    return {
        identityImei: "358263680502475",
        deviceName: "AE_0001",
        assignedUser: "user",
        model: "SM-A236M",
        route: "\\\\Desa Enterprise",
        phoneNumber: null,
        phoneFallback: null,
        registrationTime: null,
        enrollmentTime: null,
        connectionDate: null,
        disconnectionDate: null,
        phone: null,
        jiraTicket: null,
        bssidNetwork: null,
        ssidNetwork: null,
        jiraTicketIdRaw: null,
        jiraTicketIdNormalized: null,
        manufacturer: null,
        totalStorage: null,
        totalMemory: null,
        cellularOperator: null,
        osVersion: null,
        locality: null,
        company: null,
        jiraRequestRaw: null,
        jiraRequestNormalized: null,
        customPhone: null,
        customEmail: null,
        androidEnterEmail: null,
        location: null,
        sourceRowIndex: 2,
        sourceRecord: {},
        ...overrides,
    };
}

describe("validateSotiImportRows", () => {
    it("accepts valid rows and keeps counters consistent", () => {
        const result = validateSotiImportRows([buildRow()]);

        expect(result.errors).toHaveLength(0);
        expect(result.validRows).toHaveLength(1);
        expect(result.summary).toEqual({
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
        });
    });

    it("reports required-field failures and duplicate composite keys", () => {
        const result = validateSotiImportRows([
            buildRow({ sourceRowIndex: 2 }),
            buildRow({ sourceRowIndex: 3 }),
            buildRow({ sourceRowIndex: 4, identityImei: "", deviceName: "   " }),
        ]);

        expect(result.validRows).toHaveLength(1);
        expect(result.summary).toEqual({
            totalRows: 3,
            validRows: 1,
            invalidRows: 2,
        });
        expect(result.errors.some((error) => error.rowIndex === 3 && error.reason.includes("Duplicate composite key"))).toBe(true);
        expect(result.errors.some((error) => error.rowIndex === 4 && error.reason === "IMEI / MEID / ESN is required")).toBe(true);
        expect(result.errors.some((error) => error.rowIndex === 4 && error.reason === "Nombre de Dispositivo is required")).toBe(true);
    });
});
