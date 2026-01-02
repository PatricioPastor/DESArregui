import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api-auth';

export const GET = withAuth(async (request: NextRequest, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || '2025-04-01';
    const endDate = searchParams.get('end_date') || '2025-06-30';

    // Call the Postgres function with the correct format
    const result = await prisma.$queryRaw`
      SELECT phones.get_main_kpis(${startDate}::DATE, ${endDate}::DATE) as kpis
    ` as [{ kpis: any }];

    const kpisData = result[0]?.kpis;

    if (!kpisData) {
      return NextResponse.json({ error: 'No KPI data found' }, { status: 404 });
    }

    // Map the actual returned structure to frontend format
    const mappedKpis = {
      // Map to the 4 dashboard cards
      requests: kpisData.demand_analysis?.total_demand || 0,
      replacements: kpisData.demand_analysis?.replacements || 0,
      assignments: kpisData.demand_analysis?.new_assignments || 0,
      stock_current: kpisData.stock_info?.available || 0,

      // Additional useful data
      total_devices: kpisData.stock_info?.total_devices || 0,
      devices_lost: kpisData.stock_info?.lost || 0,
      utilization_rate: kpisData.stock_info?.utilization_rate || 0,
      replacement_rate: kpisData.demand_analysis?.replacement_rate || 0,

      // Period info
      period: {
        start_date: kpisData.period_info?.start_date,
        end_date: kpisData.period_info?.end_date,
        days_in_period: kpisData.period_info?.days_in_period
      }
    };

    return NextResponse.json(mappedKpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
});

