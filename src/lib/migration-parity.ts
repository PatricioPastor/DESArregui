import type { MigrationSurface } from "@/lib/migration-source-mode";

const THRESHOLD_PROFILE = {
    reports: 2,
    home: 1,
    kpis: 1,
    distributors: 0.5,
} as const;

export type ThresholdProfile = keyof typeof THRESHOLD_PROFILE;

export interface ParityEvaluatorInput {
    surface: MigrationSurface;
    thresholdProfile: ThresholdProfile;
    baseline: Record<string, number>;
    candidate: Record<string, number>;
    periodStart?: string;
    periodEnd?: string;
    createdAt?: string;
}

export interface ParityEvidence {
    surface: MigrationSurface;
    periodStart?: string;
    periodEnd?: string;
    baseline: Record<string, number>;
    candidate: Record<string, number>;
    delta: Record<string, number>;
    deltaPct: Record<string, number>;
    thresholdProfile: ThresholdProfile;
    passed: boolean;
    createdAt: string;
}

export interface ParityEvaluationResult {
    evidence: ParityEvidence;
    failedMetrics: string[];
    thresholdPct: number;
}

const toPctDelta = (baseline: number, candidate: number): number => {
    if (baseline === 0 && candidate === 0) {
        return 0;
    }

    if (baseline === 0) {
        return 100;
    }

    return ((candidate - baseline) / Math.abs(baseline)) * 100;
};

export const evaluateParity = (input: ParityEvaluatorInput): ParityEvaluationResult => {
    const metrics = new Set<string>([...Object.keys(input.baseline), ...Object.keys(input.candidate)]);
    const delta: Record<string, number> = {};
    const deltaPct: Record<string, number> = {};
    const failedMetrics: string[] = [];
    const thresholdPct = THRESHOLD_PROFILE[input.thresholdProfile];

    metrics.forEach((metric) => {
        const baselineValue = input.baseline[metric] ?? 0;
        const candidateValue = input.candidate[metric] ?? 0;
        const metricDelta = candidateValue - baselineValue;
        const metricDeltaPct = toPctDelta(baselineValue, candidateValue);

        delta[metric] = metricDelta;
        deltaPct[metric] = metricDeltaPct;

        if (Math.abs(metricDeltaPct) > thresholdPct) {
            failedMetrics.push(metric);
        }
    });

    const evidence: ParityEvidence = {
        surface: input.surface,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        baseline: input.baseline,
        candidate: input.candidate,
        delta,
        deltaPct,
        thresholdProfile: input.thresholdProfile,
        passed: failedMetrics.length === 0,
        createdAt: input.createdAt ?? new Date().toISOString(),
    };

    return {
        evidence,
        failedMetrics,
        thresholdPct,
    };
};

export const THRESHOLD_PROFILE_VALUES = THRESHOLD_PROFILE;
