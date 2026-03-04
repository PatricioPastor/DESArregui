import type { CanonicalSotiImportRow, SotiImportRowError } from "@/lib/types";

export interface ValidateSotiImportRowsSummary {
    totalRows: number;
    validRows: number;
    invalidRows: number;
}

export interface ValidateSotiImportRowsResult {
    validRows: CanonicalSotiImportRow[];
    errors: SotiImportRowError[];
    summary: ValidateSotiImportRowsSummary;
}

function buildRowError(row: CanonicalSotiImportRow, reason: string): SotiImportRowError {
    return {
        rowIndex: row.sourceRowIndex,
        reason,
        sourceRecord: row.sourceRecord,
    };
}

function buildCompositeKey(identityImei: string, deviceName: string): string {
    return `${identityImei.toUpperCase()}::${deviceName.toUpperCase()}`;
}

export function validateSotiImportRows(rows: ReadonlyArray<CanonicalSotiImportRow>): ValidateSotiImportRowsResult {
    const errors: SotiImportRowError[] = [];
    const validRows: CanonicalSotiImportRow[] = [];
    const seenCompositeKeys = new Set<string>();
    let invalidRows = 0;

    for (const row of rows) {
        const rowErrors: string[] = [];
        const identityImei = row.identityImei.trim();
        const deviceName = row.deviceName.trim();

        if (!identityImei) {
            rowErrors.push("IMEI / MEID / ESN is required");
        }

        if (!deviceName) {
            rowErrors.push("Nombre de Dispositivo is required");
        }

        if (identityImei && deviceName) {
            const compositeKey = buildCompositeKey(identityImei, deviceName);
            if (seenCompositeKeys.has(compositeKey)) {
                rowErrors.push("Duplicate composite key (IMEI / MEID / ESN + Nombre de Dispositivo) in import file");
            } else {
                seenCompositeKeys.add(compositeKey);
            }
        }

        if (rowErrors.length > 0) {
            invalidRows += 1;
            for (const reason of rowErrors) {
                errors.push(buildRowError(row, reason));
            }
            continue;
        }

        validRows.push({
            ...row,
            identityImei,
            deviceName,
        });
    }

    return {
        validRows,
        errors,
        summary: {
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows,
        },
    };
}
