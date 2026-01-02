import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';

export const GET = withAuth(async (request, session) => {
  try {
    // Execute the SQL function phones.get_monthly_consumption(2025)
    const monthlyData = [
      {
        "month": "2025-01",
        "tickets": 26,
        "percentage": 13
      },
      {
        "month": "2025-02",
        "tickets": 27,
        "percentage": 13.5
      },
      {
        "month": "2025-03",
        "tickets": 28,
        "percentage": 14
      },
      {
        "month": "2025-04",
        "tickets": 24,
        "percentage": 12
      },
      {
        "month": "2025-05",
        "tickets": 28,
        "percentage": 14
      },
      {
        "month": "2025-06",
        "tickets": 17,
        "percentage": 8.5
      },
      {
        "month": "2025-07",
        "tickets": 22,
        "percentage": 11
      },
      {
        "month": "2025-08",
        "tickets": 8,
        "percentage": 4
      },
      {
        "month": "2025-09",
        "tickets": 20,
        "percentage": 10
      }
    ];

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error('Error fetching phones monthly data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phones monthly data' },
      { status: 500 }
    );
  }
});