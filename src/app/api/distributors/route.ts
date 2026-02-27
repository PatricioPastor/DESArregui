import { NextRequest, NextResponse } from "next/server";

import { withAuth, withAdminOnly } from "@/lib/api-auth";
import { evaluateParity } from "@/lib/migration-parity";
import { captureParityEvidence } from "@/lib/migration-parity-store";
import { resolveSourceMode } from "@/lib/migration-source-mode";
import { toDistributorParitySnapshot } from "@/lib/migration-surface-parity";
import prisma from "@/lib/prisma";

interface DistributorCountRow {
  id: string;
  name: string;
  deviceCount: number;
}

const fetchDistributorCounts = async (source: "legacy" | "canonical"): Promise<DistributorCountRow[]> => {
  if (source === "canonical") {
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            devices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return distributors.map((distributor) => ({
      id: distributor.id,
      name: distributor.name,
      deviceCount: distributor._count.devices,
    }));
  }

  const distributors = await prisma.distributor.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          devices: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return distributors.map((distributor) => ({
    id: distributor.id,
    name: distributor.name,
    deviceCount: distributor._count.devices,
  }));
};


export const GET = withAuth(async (request: NextRequest, session) => {
  try {
    const sourceMode = resolveSourceMode("distributors");

    let legacyRows: DistributorCountRow[];
    let canonicalRows: DistributorCountRow[];

    if (sourceMode === "dual" || sourceMode === "canonical") {
      [legacyRows, canonicalRows] = await Promise.all([fetchDistributorCounts("legacy"), fetchDistributorCounts("canonical")]);
    } else {
      legacyRows = await fetchDistributorCounts("legacy");
      canonicalRows = legacyRows;
    }

    const selectedRows = sourceMode === "canonical" ? canonicalRows : legacyRows;

    const parity = evaluateParity({
      surface: "distributors",
      thresholdProfile: "distributors",
      baseline: toDistributorParitySnapshot(legacyRows),
      candidate: toDistributorParitySnapshot(canonicalRows),
    });

    await captureParityEvidence(parity.evidence, {
      operator: session.user.id,
      notes: `mode=${sourceMode}`,
    });

    // Convertir a formato para Select component
    const distributorOptions = selectedRows.map(distributor => ({
      value: distributor.name,
      label: `${distributor.name} (${distributor.deviceCount} dispositivos)`,
      id: distributor.id,
      name: distributor.name,
      deviceCount: distributor.deviceCount
    }));

    const response = NextResponse.json({
      success: true,
      data: distributorOptions,
      totalRecords: distributorOptions.length
    });

    response.headers.set("x-migration-source-mode", sourceMode);
    response.headers.set("x-migration-parity-pass", String(parity.evidence.passed));

    return response;

  } catch (error) {
    console.error("Distributors API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

export const POST = withAdminOnly(async (request: NextRequest, session) => {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Distributor name is required" },
        { status: 400 }
      );
    }

    // Verificar si la distribuidora ya existe
    const existingDistributor = await prisma.distributor.findUnique({
      where: { name: name.trim() }
    });

    if (existingDistributor) {
      return NextResponse.json(
        { success: false, error: "Distributor already exists" },
        { status: 409 }
      );
    }

    // Crear nueva distribuidora
    const distributor = await prisma.distributor.create({
      data: {
        name: name.trim()
      }
    });

    return NextResponse.json({
      success: true,
      message: "Distributor created successfully",
      data: distributor
    });

  } catch (error) {
    console.error("Create distributor error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});
