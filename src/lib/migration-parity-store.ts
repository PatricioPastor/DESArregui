import prisma from "@/lib/prisma";
import type { ParityEvidence } from "@/lib/migration-parity";

interface CaptureParityEvidenceOptions {
    operator?: string | null;
    notes?: string | null;
}

const parsePeriodDate = (value: string | undefined): Date | null => {
    if (!value) {
        return null;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
};

export const captureParityEvidence = async (evidence: ParityEvidence, options?: CaptureParityEvidenceOptions): Promise<void> => {
    try {
        await prisma.$executeRawUnsafe(
            `
            INSERT INTO phones.migration_parity_evidence (
                surface,
                period_start,
                period_end,
                baseline,
                candidate,
                delta,
                delta_pct,
                threshold_profile,
                passed,
                operator,
                notes
            )
            VALUES (
                $1,
                $2,
                $3,
                $4::jsonb,
                $5::jsonb,
                $6::jsonb,
                $7::jsonb,
                $8,
                $9,
                $10,
                $11
            )
            `,
            evidence.surface,
            parsePeriodDate(evidence.periodStart),
            parsePeriodDate(evidence.periodEnd),
            JSON.stringify(evidence.baseline),
            JSON.stringify(evidence.candidate),
            JSON.stringify(evidence.delta),
            JSON.stringify(evidence.deltaPct),
            evidence.thresholdProfile,
            evidence.passed,
            options?.operator ?? null,
            options?.notes ?? null,
        );
    } catch (error) {
        console.error("Failed to persist migration parity evidence:", error);
    }
};
