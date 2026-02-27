import { normalizeSimStatus } from "@/lib/sim-utils";

const MAX_QUOTE_UNWRAP_DEPTH = 4;

function unwrapSpreadsheetValue(rawValue: string): string {
    let value = rawValue.trim();

    for (let index = 0; index < MAX_QUOTE_UNWRAP_DEPTH; index += 1) {
        const before = value;

        if (value.startsWith('="') && value.endsWith('"')) {
            value = value.slice(2, -1).trim();
        }

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).trim();
        }

        value = value.replace(/""/g, '"').trim();

        if (value === before) {
            break;
        }
    }

    return value;
}

export function cleanCellValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (typeof value !== "string") {
        return "";
    }

    return unwrapSpreadsheetValue(value.replace(/^\uFEFF/, "")).trim();
}

export function normalizeHeaderValue(header: string): string {
    return cleanCellValue(header)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .toLowerCase()
        .trim();
}

export function getValueByHeaderAliases(row: Record<string, unknown>, aliases: readonly string[]): string {
    const normalizedAliases = new Set(aliases.map((alias) => normalizeHeaderValue(alias)));

    for (const [header, value] of Object.entries(row)) {
        if (normalizedAliases.has(normalizeHeaderValue(header))) {
            return cleanCellValue(value);
        }
    }

    return "";
}

export function normalizeDistributorName(value: string): string {
    const normalized = cleanCellValue(value);
    if (!normalized) {
        return "";
    }

    return normalized.replace(/\s+/g, " ").trim();
}

export function normalizeIcc(value: string): string {
    return cleanCellValue(value).replace(/\s+/g, "");
}

export function normalizeImportStatus(value: string): string {
    return normalizeSimStatus(cleanCellValue(value));
}
