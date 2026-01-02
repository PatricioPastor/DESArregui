import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { SimRecord, SimResponse } from '@/lib/types';
import { withRoles } from '@/lib/api-auth';

export const GET = withRoles(['admin', 'sims-viewer'], async (request: NextRequest, session) => {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters (using English field names)
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim();
    const provider = searchParams.get('provider')?.trim();
    const distributorId = searchParams.get('distributor_id')?.trim();
    const isActive = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where conditions
    const whereConditions: any = {};

    // Filter by status
    if (status) {
      whereConditions.status = status;
    }

    // Filter by provider
    if (provider && (provider === 'CLARO' || provider === 'MOVISTAR')) {
      whereConditions.provider = provider;
    }

    // Filter by distributor_id
    if (distributorId) {
      whereConditions.distributor_id = distributorId;
    }

    // Filter by is_active
    if (isActive !== null && isActive !== undefined) {
      whereConditions.is_active = isActive === 'true';
    }

    // Search across ICC, IP
    if (search) {
      whereConditions.OR = [
        { icc: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch SIMs with pagination and include distributor
    const [sims, totalCount] = await Promise.all([
      prisma.sim.findMany({
        where: whereConditions,
        include: {
          distributor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { provider: 'asc' },
          { status: 'asc' },
          { icc: 'asc' },
        ],
        take: Math.min(limit, 1000), // Max 1000 per request
        skip: offset,
      }),
      prisma.sim.count({
        where: whereConditions,
      }),
    ]);

    // Transform to SimRecord format
    const simRecords: SimRecord[] = sims.map(sim => ({
      icc: sim.icc,
      ip: sim.ip || undefined,
      status: sim.status,
      provider: sim.provider,
      distributor_id: sim.distributor_id || undefined,
      distributor: sim.distributor
        ? {
            id: sim.distributor.id,
            name: sim.distributor.name,
          }
        : undefined,
    }));

    // Get distinct values for filters
    const [distinctStatuses, distinctProviders, distributors] = await Promise.all([
      prisma.sim.findMany({
        select: { status: true },
        distinct: ['status'],
        orderBy: { status: 'asc' },
      }),
      prisma.sim.findMany({
        select: { provider: true },
        distinct: ['provider'],
        orderBy: { provider: 'asc' },
      }),
      prisma.distributor.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const response: SimResponse = {
      success: true,
      data: simRecords,
      totalRecords: totalCount,
      lastUpdated: sims.length > 0 ? sims[0].last_sync.toISOString() : undefined,
      metadata: {
        statuses: distinctStatuses.map(s => s.status),
        providers: distinctProviders.map(p => p.provider) as ('CLARO' | 'MOVISTAR')[],
        distributors: distributors.map(d => ({ id: d.id, name: d.name })),
        totalActive: await prisma.sim.count({ where: { is_active: true } }),
        totalInactive: await prisma.sim.count({ where: { is_active: false } }),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching SIMs:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json<SimResponse>(
      {
        success: false,
        error: `Failed to fetch SIMs: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
});
