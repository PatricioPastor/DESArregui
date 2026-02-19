import Link from "next/link";
import { notFound } from "next/navigation";
import { device_status } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { AssignOnboardingClient, type AssignmentFlow } from "./assign-onboarding.client";

type AssignSearchParams = {
    imei?: string | string[];
    flow?: string | string[];
};

const getSingleSearchParamValue = (value?: string | string[]) => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const formatModelDisplay = (model: { brand: string; model: string; storage_gb: number | null; color: string | null }) => {
    const parts = [model.brand, model.model, model.storage_gb ? `${model.storage_gb}GB` : null, model.color ? `(${model.color})` : null].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
};

export default async function AssignLandingPage({ searchParams }: { searchParams: Promise<AssignSearchParams> }) {
    const resolvedSearchParams = await searchParams;
    const rawImei = getSingleSearchParamValue(resolvedSearchParams.imei);
    const imei = rawImei?.trim();

    if (!imei) {
        notFound();
    }

    const device = await prisma.device_n1.findUnique({
        where: { imei },
        include: {
            model: {
                select: {
                    brand: true,
                    model: true,
                    storage_gb: true,
                    color: true,
                },
            },
            assignments_n1: {
                where: { status: "active" },
                select: { id: true },
                take: 1,
            },
        },
    });

    if (!device) {
        notFound();
    }

    const activeSotiDevice = await prisma.soti_device.findFirst({
        where: {
            imei: device.imei,
            is_active: true,
        },
        select: { id: true },
    });

    const canManuallyAssign = !device.is_deleted && device.status !== device_status.ASSIGNED && device.assignments_n1.length === 0 && !activeSotiDevice;

    if (!canManuallyAssign) {
        notFound();
    }

    const model = formatModelDisplay(device.model) || "Dispositivo";
    const normalizedImei = device.imei;
    const deviceId = device.id;

    const rawFlow = getSingleSearchParamValue(resolvedSearchParams.flow);
    const initialFlow: AssignmentFlow | null = rawFlow === "recambio" || rawFlow === "nueva-asignacion" ? rawFlow : null;

    return (
        <section className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-3 border-b border-secondary pb-4">
                <div className="text-sm text-tertiary">
                    <Link href="/stock" className="transition hover:text-primary">
                        Inventario
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="font-medium text-secondary">Asignación</span>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-primary">{`Asignación ${model} - ${normalizedImei}`}</h1>
            </header>

            <AssignOnboardingClient deviceId={deviceId} imei={normalizedImei} model={model} initialFlow={initialFlow} />
        </section>
    );
}
