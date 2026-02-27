import { formatEmpresa, normalizeSimProvider, normalizeSimStatus } from "@/lib/sim-utils";
import type { CanonicalSimImportRow, SimRecordInput } from "@/lib/types";

export function buildSimSyncPayload(rows: ReadonlyArray<CanonicalSimImportRow>): SimRecordInput[] {
    return rows.map((row) => {
        const provider = normalizeSimProvider(row.provider);

        if (!provider) {
            throw new Error(`Row ${row.sourceRowIndex}: Unsupported provider. Only MOVISTAR and CLARO are supported.`);
        }

        const icc = row.icc.trim().replace(/\s+/g, "");
        if (!icc) {
            throw new Error(`Row ${row.sourceRowIndex}: ICC is required`);
        }

        const distributorName = row.distributorName.trim();
        if (!distributorName) {
            throw new Error(`Row ${row.sourceRowIndex}: Distributor name is required`);
        }

        const ip = typeof row.ip === "string" ? row.ip.trim() : "";

        return {
            ICC: icc,
            IP: ip || undefined,
            Estado: normalizeSimStatus(row.status),
            Empresa: formatEmpresa(provider, distributorName),
        };
    });
}
