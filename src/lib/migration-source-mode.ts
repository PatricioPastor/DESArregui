const SOURCE_MODE = {
    LEGACY: "legacy",
    DUAL: "dual",
    CANONICAL: "canonical",
} as const;

const MIGRATION_SURFACE = {
    REPORTS_PHONES: "reports_phones",
    REPORTS_KPIS: "reports_kpis",
    HOME_KPIS: "home_kpis",
    HOME_STOCK: "home_stock",
    HOME_SHIPPING: "home_shipping",
    DISTRIBUTORS: "distributors",
    STOCK: "stock",
    ASSIGNMENTS: "assignments",
} as const;

const SOURCE_MODE_ENV_SUFFIX: Record<MigrationSurface, string> = {
    reports_phones: "REPORTS_PHONES",
    reports_kpis: "REPORTS_KPIS",
    home_kpis: "HOME_KPIS",
    home_stock: "HOME_STOCK",
    home_shipping: "HOME_SHIPPING",
    distributors: "DISTRIBUTORS",
    stock: "STOCK",
    assignments: "ASSIGNMENTS",
};

export type SourceMode = (typeof SOURCE_MODE)[keyof typeof SOURCE_MODE];
export type MigrationSurface = (typeof MIGRATION_SURFACE)[keyof typeof MIGRATION_SURFACE];

export interface SourceModeResolverOptions {
    surfaceOverrides?: Partial<Record<MigrationSurface, SourceMode>>;
    fallback?: SourceMode;
}

const SOURCE_MODE_SET = new Set<SourceMode>(Object.values(SOURCE_MODE));

const normalizeSourceMode = (value: string | undefined): SourceMode | null => {
    if (!value) {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (!SOURCE_MODE_SET.has(normalized as SourceMode)) {
        return null;
    }

    return normalized as SourceMode;
};

export const resolveSourceMode = (surface: MigrationSurface, options?: SourceModeResolverOptions): SourceMode => {
    const fallback = options?.fallback ?? SOURCE_MODE.LEGACY;

    const overrideMode = options?.surfaceOverrides?.[surface];
    if (overrideMode) {
        return overrideMode;
    }

    const surfaceEnvVar = `MIGRATION_SOURCE_MODE_${SOURCE_MODE_ENV_SUFFIX[surface]}`;
    const fromSurfaceEnv = normalizeSourceMode(process.env[surfaceEnvVar]);
    if (fromSurfaceEnv) {
        return fromSurfaceEnv;
    }

    const fromGlobalEnv = normalizeSourceMode(process.env.MIGRATION_SOURCE_MODE);
    if (fromGlobalEnv) {
        return fromGlobalEnv;
    }

    return fallback;
};

export const SOURCE_MODE_VALUES = SOURCE_MODE;
export const MIGRATION_SURFACE_VALUES = MIGRATION_SURFACE;
