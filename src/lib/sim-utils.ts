/**
 * Utility functions for SIM data processing
 */

/**
 * Parses empresa field to extract provider and distributor name
 * Format: "PROVIDER (DISTRIBUTOR)" e.g., "CLARO (EDEN)", "MOVISTAR (EDELAP)"
 * 
 * @param empresa - The empresa string from the Excel/Sheet
 * @returns Object with provider and distributorName, or null if parsing fails
 */
export function parseEmpresa(empresa: string): { provider: 'CLARO' | 'MOVISTAR'; distributorName: string } | null {
  if (!empresa || typeof empresa !== 'string') {
    return null;
  }

  const trimmed = empresa.trim();
  
  // Match pattern: "PROVIDER (DISTRIBUTOR)"
  const match = trimmed.match(/^(CLARO|MOVISTAR)\s*\(([^)]+)\)$/i);
  
  if (!match) {
    console.warn(`[sim-utils] Could not parse empresa: "${empresa}"`);
    return null;
  }

  const provider = match[1].toUpperCase() as 'CLARO' | 'MOVISTAR';
  const distributorName = match[2].trim();

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
  if (!record.icc || record.icc.trim() === '') {
    return { valid: false, error: 'ICC is required' };
  }

  if (!record.empresa || record.empresa.trim() === '') {
    return { valid: false, error: 'Empresa is required' };
  }

  const parsed = parseEmpresa(record.empresa);
  if (!parsed) {
    return { valid: false, error: `Invalid empresa format: "${record.empresa}". Expected format: "PROVIDER (DISTRIBUTOR)"` };
  }

  return { valid: true };
}




