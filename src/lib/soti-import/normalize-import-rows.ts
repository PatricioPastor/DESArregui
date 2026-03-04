import * as XLSX from "xlsx";
import type { CanonicalSotiImportRow } from "@/lib/types";

const SOTI_REQUIRED_HEADER_ALIASES = {
    deviceName: ["nombrededispositivo"],
    identityImei: ["imeimeidesn"],
} as const;

const SOTI_HEADER_ALIASES = {
    route: ["ruta"],
    deviceName: ["nombrededispositivo", "dispositivo"],
    assignedUser: ["usuarioasignado", "nomuser", "usuario"],
    model: ["modelo"],
    identityImei: ["imeimeidesn", "imei", "meid", "esn"],
    phoneNumberPrimary: ["numerodetelefono"],
    phoneNumberFallback: ["telefono"],
    jiraTicket: ["tksdejira", "ticketjira", "iddeticketdejira"],
    manufacturer: ["fabricante"],
    totalStorage: ["almacenamientototal"],
    totalMemory: ["memoriatotal"],
    cellularOperator: ["operadorcelular"],
    osVersion: ["versiondeso", "versionso"],
    locality: ["localidad"],
    company: ["empresa"],
    jiraRequestRaw: ["solicitudjira"],
    registrationTime: ["horaderegistro"],
    enrollmentTime: ["horadeinscripcion"],
    connectionDate: ["fechadeconexion"],
    disconnectionDate: ["fechadedesconexion"],
    bssidNetwork: ["bssiddered"],
    ssidNetwork: ["ssiddered"],
    jiraTicketRaw: ["iddeticketdejira", "tksdejira", "ticketjira", "solicitudjira"],
    customPhone: ["telefonocustom"],
    customEmail: ["correocustom"],
    androidEnterEmail: ["androidenterpriseemail"],
    location: ["ubicacion", "localidad"],
} as const;

export class SotiCsvContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SotiCsvContractError";
    }
}

function normalizeHeaderName(value: string): string {
    const withoutBom = value.replace(/^\uFEFF/, "");

    return withoutBom
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function toTrimmedString(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function toNullableTrimmedString(value: unknown): string | null {
    const normalized = toTrimmedString(value);
    return normalized.length > 0 ? normalized : null;
}

function extractRawByAliases(rawRow: Record<string, unknown>, aliases: ReadonlyArray<string>): unknown {
    for (const [headerName, value] of Object.entries(rawRow)) {
        if (aliases.includes(normalizeHeaderName(headerName))) {
            return value;
        }
    }

    return null;
}

function normalizeJiraTicketId(value: unknown): string | null {
    const raw = toTrimmedString(value);
    if (!raw) {
        return null;
    }

    const jiraMatch = raw.match(/DESA-(\d+)/i);
    if (jiraMatch?.[1]) {
        return jiraMatch[1];
    }

    const digitsOnly = raw.replace(/\D+/g, "");
    return digitsOnly || null;
}

export function parseSotiCsvRows(csvContent: string): Record<string, unknown>[] {
    const workbook = XLSX.read(csvContent, { type: "string", raw: false, dense: true });
    const [sheetName] = workbook.SheetNames;

    if (!sheetName) {
        return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        return [];
    }

    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: false,
    });
}

export function assertSotiCsvContract(rows: ReadonlyArray<Record<string, unknown>>): void {
    if (rows.length === 0) {
        return;
    }

    const normalizedHeaders = new Set(Object.keys(rows[0] ?? {}).map((header) => normalizeHeaderName(header)));
    const missingRequiredHeaders: string[] = [];

    for (const [logicalHeader, aliases] of Object.entries(SOTI_REQUIRED_HEADER_ALIASES)) {
        if (!aliases.some((alias) => normalizedHeaders.has(alias))) {
            missingRequiredHeaders.push(logicalHeader);
        }
    }

    if (missingRequiredHeaders.length > 0) {
        throw new SotiCsvContractError(`Missing required SOTI CSV headers: ${missingRequiredHeaders.join(", ")}`);
    }
}

export function normalizeSotiImportRows(rawRows: ReadonlyArray<Record<string, unknown>>): CanonicalSotiImportRow[] {
    return rawRows.map((rawRow, rowIndex) => {
        const identityImei = toTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.identityImei));
        const deviceName = toTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.deviceName));
        const phoneFromPreferred = toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.phoneNumberPrimary));
        const phoneFromFallback = toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.phoneNumberFallback));
        const jiraTicket = toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.jiraTicket));
        const jiraRequestRaw = toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.jiraRequestRaw));
        const jiraTicketRaw = toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.jiraTicketRaw));

        return {
            identityImei,
            deviceName,
            assignedUser: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.assignedUser)),
            model: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.model)),
            route: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.route)),
            phoneNumber: phoneFromPreferred,
            phoneFallback: phoneFromFallback,
            registrationTime: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.registrationTime)),
            enrollmentTime: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.enrollmentTime)),
            connectionDate: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.connectionDate)),
            disconnectionDate: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.disconnectionDate)),
            phone: phoneFromPreferred ?? phoneFromFallback,
            jiraTicket,
            bssidNetwork: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.bssidNetwork)),
            ssidNetwork: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.ssidNetwork)),
            jiraTicketIdRaw: jiraTicketRaw,
            jiraTicketIdNormalized: normalizeJiraTicketId(jiraTicketRaw),
            manufacturer: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.manufacturer)),
            totalStorage: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.totalStorage)),
            totalMemory: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.totalMemory)),
            cellularOperator: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.cellularOperator)),
            osVersion: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.osVersion)),
            locality: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.locality)),
            company: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.company)),
            jiraRequestRaw,
            jiraRequestNormalized: normalizeJiraTicketId(jiraRequestRaw),
            customPhone: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.customPhone)),
            customEmail: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.customEmail)),
            androidEnterEmail: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.androidEnterEmail)),
            location: toNullableTrimmedString(extractRawByAliases(rawRow, SOTI_HEADER_ALIASES.location)),
            sourceRowIndex: rowIndex + 2,
            sourceRecord: rawRow,
        };
    });
}
