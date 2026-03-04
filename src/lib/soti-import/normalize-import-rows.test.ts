import { describe, expect, it } from "bun:test";
import { assertSotiCsvContract, normalizeSotiImportRows, parseSotiCsvRows } from "@/lib/soti-import";

describe("normalizeSotiImportRows", () => {
    it("parses CSV rows with BOM/accent/case variants and normalizes key fields", () => {
        const csv =
            "\uFEFFruta,NOMBRE DE DISPOSITIVO,Nom User,modelo,IMEI / MEID / ESN,numero de telefono,Telefono,Tks de Jira,Fabricante,Almacenamiento Total,Memoria Total,Ubicacion,Operador Celular,Versión de SO,Localidad,Empresa,Solicitud JIRA\n" +
            "\\\\Desa Enterprise,AE_0001,operador,SM-A236M,358263680502475,,2916425528,DESA-70542,Samsung,64,4,Bahia Blanca,Claro,Android 14,Bahia Blanca,EDEA,DESA-80001\n";

        const parsedRows = parseSotiCsvRows(csv);
        assertSotiCsvContract(parsedRows);
        const normalizedRows = normalizeSotiImportRows(parsedRows);

        expect(normalizedRows).toHaveLength(1);
        expect(normalizedRows[0]).toMatchObject({
            identityImei: "358263680502475",
            deviceName: "AE_0001",
            assignedUser: "operador",
            phone: "2916425528",
            phoneNumber: null,
            phoneFallback: "2916425528",
            jiraTicket: "DESA-70542",
            jiraTicketIdRaw: "DESA-70542",
            jiraTicketIdNormalized: "70542",
            manufacturer: "Samsung",
            totalStorage: "64",
            totalMemory: "4",
            cellularOperator: "Claro",
            osVersion: "Android 14",
            locality: "Bahia Blanca",
            company: "EDEA",
            jiraRequestRaw: "DESA-80001",
            jiraRequestNormalized: "80001",
            location: "Bahia Blanca",
            sourceRowIndex: 2,
        });
    });

    it("normalizes jira with digits fallback when ticket format is not DESA-XXXXX", () => {
        const rows = normalizeSotiImportRows([
            {
                "Nombre de Dispositivo": "AE_0002",
                "IMEI / MEID / ESN": "350057719537850",
                "ID de Ticket de Jira": "ticket # 00116",
            },
        ]);

        expect(rows[0]?.jiraTicketIdRaw).toBe("ticket # 00116");
        expect(rows[0]?.jiraTicketIdNormalized).toBe("00116");
    });
});
