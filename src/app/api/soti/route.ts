import { NextResponse } from 'next/server';
import { getSOTIDevices, getSotiSheetData } from '@/lib/sheets';

export async function GET() {
  try {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required Google Sheets configuration. Check environment variables.',
        },
        { status: 500 }
      );
    }

    // Fetch and process SOTI records from Google Sheets
    const sotiRecords = await getSOTIDevices();
    const sheetData = await getSotiSheetData();

    // Return successful response
    const response = {
      success: true,
      data: sotiRecords,
      headers: sheetData.headers,
      totalRecords: sotiRecords.length,
      lastUpdated: sheetData.lastUpdated,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error fetching SOTI sheet data:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch SOTI sheet data: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}