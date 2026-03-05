import { describe, expect, it } from "bun:test";
import { buildJiraAssetsCsv, buildJiraAssetsExportRows, resolveSotiDistribuidora } from "@/lib/soti-stock/export-jira-assets";

describe("soti jira assets export", () => {
    it("maps distribuidora from route and DESA fallback rules", () => {
        const edensaBackslashRoute = String.raw`\\Edensa Enterprise\Region Centro\Junin`;
        const translyfBackslashRoute = String.raw`\\Translyf Enterprise\PROD\EDES Kiosco`;

        expect(resolveSotiDistribuidora("//Edensa Enterprise//Sucursal", null)).toBe("EDEN");
        expect(resolveSotiDistribuidora(edensaBackslashRoute, null)).toBe("EDEN");
        expect(resolveSotiDistribuidora("//EDENSA", null)).toBe("EDEN");
        expect(resolveSotiDistribuidora("//Edea Enterprise/", null)).toBe("EDEA");
        expect(resolveSotiDistribuidora("//Translyf/PROD/EDEA Kiosco", null)).toBe("EDEA");
        expect(resolveSotiDistribuidora("//Translyf/PROD/EDES Kiosco", null)).toBe("EDES");
        expect(resolveSotiDistribuidora(translyfBackslashRoute, null)).toBe("EDES");
        expect(resolveSotiDistribuidora("//Desa Enterprise//Norte", null)).toBe("DESA");
        expect(resolveSotiDistribuidora("//Desa Enterprise//Norte", "edea")).toBe("EDEA");
    });

    it("builds export rows from SOTI plus stock nuevo without duplicate IMEI", () => {
        const rows = buildJiraAssetsExportRows({
            sotiRecords: [
                {
                    idSoti: "AE_0001",
                    user: "operador",
                    model: "Samsung A23",
                    imei: "358263680502475",
                    route: "//Edensa Enterprise//Zona",
                    company: null,
                    phoneNumber: "2916000000",
                    phoneFallback: "2916111111",
                    phoneLegacy: "2916222222",
                    ticketJira: "70542",
                    manufacturer: "Samsung",
                    storage: "1073741824",
                    ram: "2147483648",
                    locality: "Bahia Blanca",
                    cellularOperator: "Claro",
                    osVersion: "Android 14",
                    sotiActive: true,
                },
            ],
            stockNuevoRecords: [
                {
                    imei: "358263680502475",
                    distributor: "EDEN",
                    ownerName: null,
                    model: "Samsung A23",
                    manufacturer: "Samsung",
                    storageGb: 64,
                    ticketJira: "70542",
                },
                {
                    imei: "359999999999999",
                    distributor: "EDEA",
                    ownerName: "Patricio Pastor",
                    model: "Moto G54",
                    manufacturer: "Motorola",
                    storageGb: 128,
                    ticketJira: "81234",
                },
            ],
        });

        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            distribuidora: "EDEN",
            idSoti: "AE_0001",
            almacenamiento: "1",
            ram: "2",
            numeroTelefono: "2916000000",
            sotiActivo: "SI",
        });
        expect(rows[1]).toMatchObject({
            distribuidora: "EDEA",
            idSoti: "No Aplica",
            usuario: "Patricio Pastor (BACKUP)",
            numeroTelefono: "Sin Linea",
            ticketJira: "No Aplica",
            almacenamiento: "128",
            localidad: "EDEA DEPOSITO",
            sotiActivo: "NO",
        });
    });

    it("emits the required A1-O1 headers", () => {
        const csv = buildJiraAssetsCsv([
            {
                distribuidora: "EDEN",
                idSoti: "AE_0001",
                usuario: "operador",
                modelo: "Samsung A23",
                imei: "358263680502475",
                numeroTelefono: "2916000000",
                ticketJira: "70542",
                fabricante: "Samsung",
                almacenamiento: "64",
                ram: "4",
                localidad: "Bahia Blanca",
                operadorCelular: "Claro",
                versionSo: "Android 14",
                sotiActivo: "SI",
            },
        ]);

        expect(csv.split("\n")[0]).toBe(
            "Distribuidora,ID SOTI,Usuario,Modelo,IMEI,Número de Teléfono,Ticket JIRA,Fabricante,Almacenamiento,RAM,Localidad,Operador Celular,Versión de SO,SOTI ACTIVO",
        );
    });

    it("uses phone fallback order number > telefono > legacy", () => {
        const rows = buildJiraAssetsExportRows({
            sotiRecords: [
                {
                    idSoti: "AE_0002",
                    user: "operador",
                    model: "Samsung A23",
                    imei: "111",
                    route: "//Edea Enterprise/",
                    company: null,
                    phoneNumber: null,
                    phoneFallback: "2211111111",
                    phoneLegacy: "2219999999",
                    ticketJira: "999",
                    manufacturer: "Samsung",
                    storage: null,
                    ram: null,
                    locality: null,
                    cellularOperator: null,
                    osVersion: null,
                    sotiActive: true,
                },
                {
                    idSoti: "AE_0003",
                    user: "operador",
                    model: "Samsung A23",
                    imei: "222",
                    route: "//Edea Enterprise/",
                    company: null,
                    phoneNumber: null,
                    phoneFallback: null,
                    phoneLegacy: "2233333333",
                    ticketJira: "998",
                    manufacturer: "Samsung",
                    storage: null,
                    ram: null,
                    locality: null,
                    cellularOperator: null,
                    osVersion: null,
                    sotiActive: true,
                },
            ],
            stockNuevoRecords: [],
        });

        expect(rows[0]?.numeroTelefono).toBe("2211111111");
        expect(rows[1]?.numeroTelefono).toBe("2233333333");
    });

    it("maps stock-only defaults for Jira Assets export", () => {
        const rows = buildJiraAssetsExportRows({
            sotiRecords: [],
            stockNuevoRecords: [
                {
                    imei: "359123456789012",
                    distributor: "EDES",
                    ownerName: "Juan Perez",
                    model: "Galaxy A16",
                    manufacturer: "Samsung",
                    storageGb: 256,
                    ticketJira: "DESA-12345",
                },
            ],
        });

        expect(rows[0]).toMatchObject({
            idSoti: "No Aplica",
            usuario: "Juan Perez (BACKUP)",
            numeroTelefono: "Sin Linea",
            ticketJira: "No Aplica",
            localidad: "EDES DEPOSITO",
        });
    });
});
