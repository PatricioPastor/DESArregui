import type { CanonicalSimImportRow, SimImportAdapter, SimImportAdapterOutput, SimImportRowError } from "@/lib/types";
import { SUPPORTED_SIM_PROVIDER } from "@/lib/types";
import { cleanCellValue, getValueByHeaderAliases, normalizeDistributorName, normalizeIcc, normalizeImportStatus } from "@/lib/sim-import/adapters/shared";

const CLARO_HEADER_ALIASES = {
    icc: ["ICCID", "ICC", "icc"],
    ip: ["Direccion IP", "Direcci n IP", "IP", "ip"],
    status: ["Estado de SIM", "Estado", "SIM Status", "status"],
    distributorName: ["Plan de comunicacion", "Plan de comunicaci n", "Empresa", "Distribuidora"],
} as const;

function buildRowError(rowIndex: number, reason: string, sourceRecord: Record<string, unknown>): SimImportRowError {
    return {
        provider: SUPPORTED_SIM_PROVIDER.CLARO,
        rowIndex,
        reason,
        sourceRecord,
    };
}

function toCanonicalRow(rawRow: Record<string, unknown>, rowIndex: number): { row?: CanonicalSimImportRow; error?: SimImportRowError } {
    const icc = normalizeIcc(getValueByHeaderAliases(rawRow, CLARO_HEADER_ALIASES.icc));
    if (!icc) {
        return { error: buildRowError(rowIndex, "Missing ICCID field", rawRow) };
    }

    const distributorName = normalizeDistributorName(getValueByHeaderAliases(rawRow, CLARO_HEADER_ALIASES.distributorName));
    if (!distributorName) {
        return { error: buildRowError(rowIndex, "Missing distributor/company field", rawRow) };
    }

    const statusRaw = getValueByHeaderAliases(rawRow, CLARO_HEADER_ALIASES.status);
    const ipRaw = getValueByHeaderAliases(rawRow, CLARO_HEADER_ALIASES.ip);

    return {
        row: {
            provider: SUPPORTED_SIM_PROVIDER.CLARO,
            icc,
            ip: cleanCellValue(ipRaw) || null,
            status: normalizeImportStatus(statusRaw),
            distributorName,
            sourceRowIndex: rowIndex,
            sourceRecord: rawRow,
        },
    };
}

export const claroXlsxAdapter: SimImportAdapter = {
    provider: SUPPORTED_SIM_PROVIDER.CLARO,
    adapterName: "claro-xlsx",
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
                provider: SUPPORTED_SIM_PROVIDER.CLARO,
                totalRows: rows.length,
                validRows: extractedRows.length,
                invalidRows: errors.length,
            },
        };
    },
};
