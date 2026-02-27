import type { CanonicalSimImportRow, SimImportAdapter, SimImportAdapterOutput, SimImportRowError } from "@/lib/types";
import { SUPPORTED_SIM_PROVIDER } from "@/lib/types";
import { normalizeImportStatus, normalizeDistributorName, normalizeIcc, getValueByHeaderAliases, cleanCellValue } from "@/lib/sim-import/adapters/shared";

const MOVISTAR_HEADER_ALIASES = {
    icc: ["icc", "iccid"],
    ip: ["currentIp", "current ip", "ip", "lastUsedIp", "staticIpAddress"],
    status: ["lte_status", "lifeCycleStatus", "status", "estado", "gprsStatus_status"],
    distributorName: ["customerName", "endCustomerName", "commercialGroup", "supervisionGroup", "empresa"],
} as const;

function buildRowError(rowIndex: number, reason: string, sourceRecord: Record<string, unknown>): SimImportRowError {
    return {
        provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
        rowIndex,
        reason,
        sourceRecord,
    };
}

function toCanonicalRow(rawRow: Record<string, unknown>, rowIndex: number): { row?: CanonicalSimImportRow; error?: SimImportRowError } {
    const icc = normalizeIcc(getValueByHeaderAliases(rawRow, MOVISTAR_HEADER_ALIASES.icc));
    if (!icc) {
        return { error: buildRowError(rowIndex, "Missing ICC field", rawRow) };
    }

    const distributorName = normalizeDistributorName(getValueByHeaderAliases(rawRow, MOVISTAR_HEADER_ALIASES.distributorName));
    if (!distributorName) {
        return { error: buildRowError(rowIndex, "Missing distributor/company field", rawRow) };
    }

    const statusRaw = getValueByHeaderAliases(rawRow, MOVISTAR_HEADER_ALIASES.status);
    const ipRaw = getValueByHeaderAliases(rawRow, MOVISTAR_HEADER_ALIASES.ip);

    return {
        row: {
            provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
            icc,
            ip: cleanCellValue(ipRaw) || null,
            status: normalizeImportStatus(statusRaw),
            distributorName,
            sourceRowIndex: rowIndex,
            sourceRecord: rawRow,
        },
    };
}

export const movistarCsvAdapter: SimImportAdapter = {
    provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
    adapterName: "movistar-csv",
    extractRows(rows: ReadonlyArray<Record<string, unknown>>): SimImportAdapterOutput {
        const extractedRows: CanonicalSimImportRow[] = [];
        const errors: SimImportRowError[] = [];

        rows.forEach((row, index) => {
            const rowIndex = index + 2;
            const result = toCanonicalRow(row, rowIndex);

            if (result.error) {
                errors.push(result.error);
                return;
            }

            if (result.row) {
                extractedRows.push(result.row);
            }
        });

        return {
            rows: extractedRows,
            errors,
            summary: {
                provider: SUPPORTED_SIM_PROVIDER.MOVISTAR,
                totalRows: rows.length,
                validRows: extractedRows.length,
                invalidRows: errors.length,
            },
        };
    },
};
