import { NextResponse } from 'next/server';
import { getRocioReportSheetData, processRows, createAnalysisWorkbook } from '@/lib/sheets';
import * as XLSX from 'xlsx';

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

    const sheetData = await getRocioReportSheetData();
    const analysis = processRows(sheetData.rows, sheetData.headers);

    // Create XLSX workbook
    const workbook = createAnalysisWorkbook(analysis, sheetData.headers);
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return XLSX file as download
    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ROCIO_ANALISIS_CLAUDE.xlsx"',
        'Content-Length': xlsxBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('API Error generating XLSX download:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate XLSX download: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}