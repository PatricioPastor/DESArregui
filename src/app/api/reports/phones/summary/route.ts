import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface EnhancedKpisResponse {
  kpis: {
    total_tickets: number;
    total_demand: number;
    assignments: number;
    replacements: number;
    replacement_rate: number;
  };
  stock: {
    available: number;
    models: Array<{
      brand: string;
      model: string;
      color: string | null;
      storage_gb: number | null;
      count: number;
      display_name: string;
    }>;
  };
  tickets: Array<any>;
  monthly_data: Array<{
    month: string;
    month_number: number;
    tickets: number;
    demand: number;
    is_projected: boolean;
    projected_demand: number | null;
  }>;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('start_date') || '2025-04-01';
    const endDate = searchParams.get('end_date') || '2025-06-30';

    // Validar formato de fechas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validar que start_date <= end_date
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'start_date must be before or equal to end_date' },
        { status: 400 }
      );
    }

    console.log(`[phones/summary] Fetching data for ${startDate} to ${endDate}`);

    // Llamar a la función PostgreSQL
    const result = await prisma.$queryRaw<[{ get_enhanced_kpis: EnhancedKpisResponse }]>`
      SELECT phones.get_enhanced_kpis(${startDate}::DATE, ${endDate}::DATE) as get_enhanced_kpis
    `;

    const summaryData = result[0]?.get_enhanced_kpis;

    if (!summaryData) {
      return NextResponse.json(
        { error: 'No data found for the specified period' },
        { status: 404 }
      );
    }

    console.log(`[phones/summary] Success: ${summaryData.kpis.total_tickets} tickets, ${summaryData.stock.available} devices available`);

    return NextResponse.json(summaryData);

  } catch (error) {
    console.error('[phones/summary] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch phones summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
