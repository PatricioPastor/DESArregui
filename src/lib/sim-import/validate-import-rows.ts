import { SUPPORTED_SIM_PROVIDER, type CanonicalSimImportRow, type SimImportRowError } from "@/lib/types";
import { normalizeSimProvider, normalizeSimStatus } from "@/lib/sim-utils";

export const SIM_IMPORT_ICC_MIN_LENGTH = 18;
export const SIM_IMPORT_ICC_MAX_LENGTH = 22;

export interface ValidateImportRowsSummary {
    totalRows: number;
    validRows: number;
    invalidRows: number;
}

export interface ValidateImportRowsResult {
    validRows: CanonicalSimImportRow[];
    errors: SimImportRowError[];
    summary: ValidateImportRowsSummary;
}

function normalizeIccForValidation(value: string): string {
    return value.trim().replace(/\s+/g, "");
}

function containsScientificNotationArtifacts(value: string): boolean {
    return /[eE+\-.]/.test(value);
}

function isValidIpv4(value: string): boolean {
    const segments = value.split(".");

    if (segments.length !== 4) {
        return false;
    }

    return segments.every((segment) => {
        if (!/^\d{1,3}$/.test(segment)) {
            return false;
        }

        const parsed = Number(segment);
        return parsed >= 0 && parsed <= 255;
    });
}

function isValidIpv6(value: string): boolean {
    if (!/^[0-9a-fA-F:]+$/.test(value)) {
        return false;
    }

    if (value.includes(":::")) {
        return false;
    }

    const compressionParts = value.split("::");
    if (compressionParts.length > 2) {
        return false;
    }

    const leftParts = compressionParts[0] ? compressionParts[0].split(":") : [];
    const rightParts = compressionParts.length === 2 && compressionParts[1] ? compressionParts[1].split(":") : [];
    const hasCompression = compressionParts.length === 2;

    const allParts = [...leftParts, ...rightParts];
    const everyPartIsValid = allParts.every((segment) => /^[0-9a-fA-F]{1,4}$/.test(segment));

    if (!everyPartIsValid) {
        return false;
    }

    if (hasCompression) {
        return allParts.length < 8;
    }

    return allParts.length === 8;
}

function isValidIpAddress(value: string): boolean {
    return isValidIpv4(value) || isValidIpv6(value);
}

function buildRowError(row: CanonicalSimImportRow, reason: string): SimImportRowError {
    const provider = normalizeSimProvider(row.provider) ?? SUPPORTED_SIM_PROVIDER.MOVISTAR;

    return {
        provider,
        rowIndex: row.sourceRowIndex,
        reason,
        sourceRecord: row.sourceRecord,
    };
}

export function validateImportRows(rows: ReadonlyArray<CanonicalSimImportRow>): ValidateImportRowsResult {
    const validRows: CanonicalSimImportRow[] = [];
    const errors: SimImportRowError[] = [];
    const seenIcc = new Set<string>();
    let invalidRowCount = 0;

    for (const row of rows) {
        const rowErrors: string[] = [];
        const provider = normalizeSimProvider(row.provider);
        const normalizedIcc = normalizeIccForValidation(row.icc);
        const normalizedDistributorName = row.distributorName.trim();
        const normalizedStatus = normalizeSimStatus(row.status);
        const normalizedIp = typeof row.ip === "string" ? row.ip.trim() : "";
        let hasScientificNotationArtifacts = false;
        let hasDigitsOnlyIcc = false;
        let hasValidIccLength = false;

        if (!provider) {
            rowErrors.push("Provider is required and must be MOVISTAR or CLARO");
        }

        if (!normalizedIcc) {
            rowErrors.push("ICC is required");
        } else {
            hasScientificNotationArtifacts = containsScientificNotationArtifacts(normalizedIcc);
            if (hasScientificNotationArtifacts) {
                rowErrors.push("ICC cannot include scientific-notation artifacts (E, +, -, .)");
            }

            hasDigitsOnlyIcc = /^\d+$/.test(normalizedIcc);
            if (!hasDigitsOnlyIcc) {
                rowErrors.push("ICC must contain digits only");
            }

            hasValidIccLength = normalizedIcc.length >= SIM_IMPORT_ICC_MIN_LENGTH && normalizedIcc.length <= SIM_IMPORT_ICC_MAX_LENGTH;
            if (!hasValidIccLength) {
                rowErrors.push(`ICC length must be between ${SIM_IMPORT_ICC_MIN_LENGTH} and ${SIM_IMPORT_ICC_MAX_LENGTH} digits`);
            }

            const canCheckDuplicates = !hasScientificNotationArtifacts && hasDigitsOnlyIcc && hasValidIccLength;
            if (canCheckDuplicates && seenIcc.has(normalizedIcc)) {
                rowErrors.push("Duplicate ICC in import file");
            }

            if (canCheckDuplicates) {
                seenIcc.add(normalizedIcc);
            }
        }

        if (!normalizedDistributorName) {
            rowErrors.push("Distributor name is required");
        }

        if (normalizedIp && !isValidIpAddress(normalizedIp)) {
            rowErrors.push("IP must be a valid IPv4 or IPv6 address");
        }

        if (rowErrors.length > 0) {
            invalidRowCount += 1;
            for (const reason of rowErrors) {
                errors.push(buildRowError(row, reason));
            }
            continue;
        }

        validRows.push({
            ...row,
            provider: provider as CanonicalSimImportRow["provider"],
            icc: normalizedIcc,
            ip: normalizedIp || null,
            status: normalizedStatus,
            distributorName: normalizedDistributorName,
        });
    }

    return {
        validRows,
        errors,
        summary: {
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows: invalidRowCount,
        },
    };
}
