export interface SotiJiraExportSourceRecord {
    idSoti: string;
    user: string | null;
    model: string | null;
    imei: string;
    route: string | null;
    company: string | null;
    phoneNumber: string | null;
    phoneFallback: string | null;
    phoneLegacy: string | null;
    ticketJira: string | null;
    manufacturer: string | null;
    storage: string | null;
    ram: string | null;
    locality: string | null;
    cellularOperator: string | null;
    osVersion: string | null;
    sotiActive: boolean;
}

export interface StockNuevoJiraExportSourceRecord {
    imei: string;
    distributor: string | null;
    model: string | null;
    manufacturer: string | null;
    storageGb: number | null;
    ticketJira: string | null;
}

export interface JiraAssetExportRecord {
    distribuidora: string;
    idSoti: string;
    usuario: string;
    modelo: string;
    imei: string;
    numeroTelefono: string;
    ticketJira: string;
    fabricante: string;
    almacenamiento: string;
    ram: string;
    localidad: string;
    operadorCelular: string;
    versionSo: string;
    sotiActivo: string;
}

const CSV_HEADERS = [
    "Distribuidora",
    "ID SOTI",
    "Usuario",
    "Modelo",
    "IMEI",
    "Número de Teléfono",
    "Ticket JIRA",
    "Fabricante",
    "Almacenamiento",
    "RAM",
    "Localidad",
    "Operador Celular",
    "Versión de SO",
    "SOTI ACTIVO",
] as const;

const DISTRIBUTOR_ROUTE_MAP = [
    { matcher: /edensa\s+enterprise|\/edensa\b/i, value: "EDEN" },
    { matcher: /edea\s+enterprise/i, value: "EDEA" },
    { matcher: /edesa\s+enterprise/i, value: "EDESA" },
    { matcher: /edelap\s+enterprise/i, value: "EDELAP" },
    { matcher: /edes\s+enterprise/i, value: "EDES" },
] as const;

const toTrimmed = (value: string | null | undefined): string => {
    return (value ?? "").trim();
};

const escapeCsvCell = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
};

const formatNumberCompact = (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) {
        return "";
    }

    return Number(value.toFixed(2)).toString();
};

const normalizeGb = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "number") {
        return formatNumberCompact(value);
    }

    const normalized = value.trim();
    if (!normalized) {
        return "";
    }

    const lower = normalized.toLowerCase();
    const numericMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
    if (!numericMatch?.[1]) {
        return "";
    }

    const parsed = Number.parseFloat(numericMatch[1].replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return "";
    }

    if (lower.includes("gb")) {
        return formatNumberCompact(parsed);
    }

    if (lower.includes("mb")) {
        return formatNumberCompact(parsed / 1024);
    }

    if (parsed >= 1024 * 1024 * 1024) {
        return formatNumberCompact(parsed / (1024 * 1024 * 1024));
    }

    if (parsed >= 1024) {
        return formatNumberCompact(parsed / 1024);
    }

    return formatNumberCompact(parsed);
};

export const resolveSotiDistribuidora = (route: string | null | undefined, company: string | null | undefined): string => {
    const routeValue = toTrimmed(route);
    const normalizedRoute = routeValue.toLowerCase().replace(/\\+/g, "/").replace(/\/+/g, "/");
    const companyValue = toTrimmed(company);

    for (const item of DISTRIBUTOR_ROUTE_MAP) {
        if (item.matcher.test(normalizedRoute)) {
            return item.value;
        }
    }

    if (normalizedRoute.includes("translyf")) {
        if (normalizedRoute.includes("prod/edea kiosco")) {
            return "EDEA";
        }

        if (normalizedRoute.includes("prod/edes kiosco")) {
            return "EDES";
        }
    }

    if (/desa\s+enterprise/i.test(normalizedRoute)) {
        if (companyValue) {
            return companyValue.toUpperCase();
        }

        return "DESA";
    }

    return companyValue ? companyValue.toUpperCase() : "";
};

export const buildJiraAssetsExportRows = (params: {
    sotiRecords: ReadonlyArray<SotiJiraExportSourceRecord>;
    stockNuevoRecords: ReadonlyArray<StockNuevoJiraExportSourceRecord>;
}): JiraAssetExportRecord[] => {
    const sotiRows = params.sotiRecords.map<JiraAssetExportRecord>((record) => ({
        distribuidora: resolveSotiDistribuidora(record.route, record.company),
        idSoti: toTrimmed(record.idSoti),
        usuario: toTrimmed(record.user),
        modelo: toTrimmed(record.model),
        imei: toTrimmed(record.imei),
        numeroTelefono: toTrimmed(record.phoneNumber) || toTrimmed(record.phoneFallback) || toTrimmed(record.phoneLegacy),
        ticketJira: toTrimmed(record.ticketJira),
        fabricante: toTrimmed(record.manufacturer),
        almacenamiento: normalizeGb(record.storage),
        ram: normalizeGb(record.ram),
        localidad: toTrimmed(record.locality),
        operadorCelular: toTrimmed(record.cellularOperator),
        versionSo: toTrimmed(record.osVersion),
        sotiActivo: record.sotiActive ? "SI" : "NO",
    }));

    const existingImeis = new Set(sotiRows.map((row) => row.imei).filter(Boolean));

    const stockRows = params.stockNuevoRecords
        .filter((record) => {
            const imei = toTrimmed(record.imei);
            return imei.length > 0 && !existingImeis.has(imei);
        })
        .map<JiraAssetExportRecord>((record) => ({
            distribuidora: toTrimmed(record.distributor).toUpperCase(),
            idSoti: "",
            usuario: "",
            modelo: toTrimmed(record.model),
            imei: toTrimmed(record.imei),
            numeroTelefono: "",
            ticketJira: toTrimmed(record.ticketJira),
            fabricante: toTrimmed(record.manufacturer),
            almacenamiento: normalizeGb(record.storageGb),
            ram: "",
            localidad: "",
            operadorCelular: "",
            versionSo: "",
            sotiActivo: "NO",
        }));

    return [...sotiRows, ...stockRows];
};

export const buildJiraAssetsCsv = (rows: ReadonlyArray<JiraAssetExportRecord>): string => {
    const body = rows
        .map((row) =>
            [
                row.distribuidora,
                row.idSoti,
                row.usuario,
                row.modelo,
                row.imei,
                row.numeroTelefono,
                row.ticketJira,
                row.fabricante,
                row.almacenamiento,
                row.ram,
                row.localidad,
                row.operadorCelular,
                row.versionSo,
                row.sotiActivo,
            ]
                .map((cell) => escapeCsvCell(cell))
                .join(","),
        )
        .join("\n");

    return `${CSV_HEADERS.join(",")}\n${body}`;
};
