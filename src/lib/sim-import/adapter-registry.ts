import { claroXlsxAdapter } from "@/lib/sim-import/adapters/claro-adapter";
import { movistarCsvAdapter } from "@/lib/sim-import/adapters/movistar-adapter";
import type { SimImportAdapter, SupportedSimProvider } from "@/lib/types";
import { normalizeSimProvider } from "@/lib/sim-utils";

const ADAPTER_REGISTRY: Record<SupportedSimProvider, SimImportAdapter> = {
    CLARO: claroXlsxAdapter,
    MOVISTAR: movistarCsvAdapter,
};

export function resolveSimImportAdapter(selectedProvider: unknown): SimImportAdapter {
    const normalizedProvider = normalizeSimProvider(selectedProvider);

    if (!normalizedProvider) {
        throw new Error("Unsupported provider. Only MOVISTAR and CLARO are supported.");
    }

    return ADAPTER_REGISTRY[normalizedProvider];
}
