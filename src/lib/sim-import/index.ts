import { resolveSimImportAdapter } from "@/lib/sim-import/adapter-registry";
import { buildSimSyncPayload } from "@/lib/sim-import/to-sync-payload";
import { validateImportRows } from "@/lib/sim-import/validate-import-rows";
import type { CanonicalSimImportRow, SimImportRowError, SimRecordInput } from "@/lib/types";

export interface ValidateImportRowsResult {
    validRows: CanonicalSimImportRow[];
    errors: SimImportRowError[];
    summary: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
    };
}

export type ValidateImportRows = (rows: ReadonlyArray<CanonicalSimImportRow>) => ValidateImportRowsResult;

export type BuildSimSyncPayload = (rows: ReadonlyArray<CanonicalSimImportRow>) => SimRecordInput[];

export { resolveSimImportAdapter };
export { validateImportRows, buildSimSyncPayload };
