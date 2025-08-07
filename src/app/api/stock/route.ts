import { NextResponse } from 'next/server';
import { getStockRecords, getStockSheetData } from '@/lib/sheets';
import type { StockSheetResponse } from '@/lib/types';

export async function GET() {
  try {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json<StockSheetResponse>(
        {
          success: false,
          error: 'Missing required Google Sheets configuration. Check environment variables.',
        },
        { status: 500 }
      );
    }

    // Fetch and process stock records from Google Sheets
    const stockRecords = await getStockRecords();
    const sheetData = await getStockSheetData();

    // Return successful response
    const response: StockSheetResponse = {
      success: true,
      data: stockRecords,
      headers: sheetData.headers,
      totalRecords: stockRecords.length,
      lastUpdated: sheetData.lastUpdated,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error fetching STOCK sheet data:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json<StockSheetResponse>(
      {
        success: false,
        error: `Failed to fetch STOCK sheet data: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}