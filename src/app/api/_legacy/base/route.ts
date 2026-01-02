import { NextResponse } from 'next/server';
import { getIMEIRecords, getBaseSheetData } from '@/lib/sheets';
import type { BaseSheetResponse } from '@/lib/types';

export async function GET() {
  try {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json<BaseSheetResponse>(
        {
          success: false,
          error: 'Missing required Google Sheets configuration. Check environment variables.',
        },
        { status: 500 }
      );
    }

    // Fetch and process IMEI records from Google Sheets
    const imeiRecords = await getIMEIRecords();
    const sheetData = await getBaseSheetData();

    // Return successful response
    const response: BaseSheetResponse = {
      success: true,
      data: imeiRecords,
      headers: sheetData.headers,
      totalRecords: imeiRecords.length,
      lastUpdated: sheetData.lastUpdated,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error fetching BASE sheet data:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json<BaseSheetResponse>(
      {
        success: false,
        error: `Failed to fetch BASE sheet data: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}