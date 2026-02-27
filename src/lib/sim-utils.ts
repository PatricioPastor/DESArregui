/**
 * Utility functions for SIM data processing
 */

import { SUPPORTED_SIM_PROVIDER, type SupportedSimProvider } from "@/lib/types";

const SUPPORTED_PROVIDER_VALUES: SupportedSimProvider[] = Object.values(SUPPORTED_SIM_PROVIDER);

export function isSupportedSimProvider(value: unknown): value is SupportedSimProvider {
    return typeof value === "string" && SUPPORTED_PROVIDER_VALUES.includes(value as SupportedSimProvider);
}

export function normalizeSimProvider(value: unknown): SupportedSimProvider | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalizedProvider = value.trim().toUpperCase();
    return isSupportedSimProvider(normalizedProvider) ? normalizedProvider : null;
}

export function normalizeSimStatus(value: unknown): string {
    if (typeof value !== "string") {
        return "Inventario";
    }

    const normalized = value.trim();
    if (!normalized) {
        return "Inventario";
    }

    if (normalized.toLowerCase() === "active") {
        return "Activado";
    }

    if (normalized.toLowerCase() === "inactive") {
        return "Desactivado";
    }

    return normalized;
}

export function formatEmpresa(provider: SupportedSimProvider, distributorName: string): string {
    const normalizedProvider = normalizeSimProvider(provider);
    if (!normalizedProvider) {
        throw new Error("Unsupported SIM provider. Supported providers: MOVISTAR, CLARO");
    }

    const normalizedDistributorName = distributorName.trim();
    if (!normalizedDistributorName) {
        throw new Error("Distributor name is required to format Empresa");
    }

    return `${normalizedProvider} (${normalizedDistributorName})`;
}

/**
 * Parses empresa field to extract provider and distributor name
 * Format: "PROVIDER (DISTRIBUTOR)" e.g., "CLARO (EDEN)", "MOVISTAR (EDELAP)"
 * 
 * @param empresa - The empresa string from the Excel/Sheet
 * @returns Object with provider and distributorName, or null if parsing fails
 */
export function parseEmpresa(empresa: string): { provider: SupportedSimProvider; distributorName: string } | null {
    if (!empresa || typeof empresa !== "string") {
        return null;
    }

    const trimmed = empresa.trim();

    // Match pattern: "PROVIDER (DISTRIBUTOR)"
    const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);

    if (!match) {
        console.warn(`[sim-utils] Could not parse empresa: "${empresa}"`);
        return null;
    }

    const provider = normalizeSimProvider(match[1]);
    const distributorName = match[2].trim();

    if (!provider) {
        console.warn(`[sim-utils] Unsupported provider in empresa: "${empresa}"`);
        return null;
    }

    if (!distributorName) {
        console.warn(`[sim-utils] Empty distributor name in empresa: "${empresa}"`);
        return null;
    }

    return { provider, distributorName };
}

/**
 * Validates SIM record structure
 */
export function validateSimRecord(record: {
    icc?: string;
    ip?: string;
    status?: string;
    empresa?: string;
}): { valid: boolean; error?: string } {
    if (!record.icc || record.icc.trim() === "") {
        return { valid: false, error: "ICC is required" };
    }

    if (!record.empresa || record.empresa.trim() === "") {
        return { valid: false, error: "Empresa is required" };
    }

    const parsed = parseEmpresa(record.empresa);
    if (!parsed) {
        return { valid: false, error: `Invalid empresa format: "${record.empresa}". Expected format: "PROVIDER (DISTRIBUTOR)"` };
    }

    return { valid: true };
}




