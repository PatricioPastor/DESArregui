import { NextResponse } from 'next/server';
import { getIMEIRecords, getBaseSheetData, getRocioReportSheetData, processRows, deduplicateByPhoneNumber, createPhoneDeduplicationWorkbook } from '@/lib/sheets';
import type { BaseSheetResponse } from '@/lib/types';
import * as XLSX from 'xlsx';

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

  
    const sheetData = await getRocioReportSheetData();

    
    const analysis = processRows(sheetData.rows, sheetData.headers);

    // Deduplicate ALL records by phone number
    const phoneProcessing = deduplicateByPhoneNumber(analysis, sheetData.headers);
    console.log(`Phone Deduplication: ${phoneProcessing.originalCount} → ${phoneProcessing.deduplicatedCount} (removed ${phoneProcessing.removedDuplicates} duplicates)`);

    // Create phone deduplication Excel workbook and return as download
    const workbook = createPhoneDeduplicationWorkbook(phoneProcessing, sheetData.headers, analysis.records);
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return XLSX file as download
    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Reporte_Deduplicado_Telefonos.xlsx"',
        'Content-Length': xlsxBuffer.length.toString(),
      },
    });

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