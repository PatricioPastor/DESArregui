import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleSheetsAuth } from '@/lib/sheets';

interface UpdateRecordRequest {
  imei: string;
  field: string;
  value: string;
  rowIndex?: number;
}

export async function POST(request: Request) {
  try {
    const body: UpdateRecordRequest = await request.json();
    const { imei, field, value, rowIndex } = body;

    if (!imei || !field || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imei, field, value' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { success: false, error: 'Missing Google Sheets configuration' },
        { status: 500 }
      );
    }

    const sheets = await getGoogleSheetsAuth();

    // If we don't have the row index, we need to find it
    let targetRowIndex = rowIndex;
    
    if (!targetRowIndex) {
      // Get all data to find the row with matching IMEI
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'BASE!A:N',
      });

      const data = response.data.values || [];
      const [headers, ...rows] = data;
      
      const imeiColumnIndex = headers?.findIndex(header => 
        header?.toLowerCase().trim() === 'imei'
      );

      if (imeiColumnIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'IMEI column not found in sheet' },
          { status: 400 }
        );
      }

      targetRowIndex = rows.findIndex(row => row[imeiColumnIndex] === imei);
      
      if (targetRowIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'IMEI record not found' },
          { status: 404 }
        );
      }
      
      // Add 3 to account for extra header row (1) + real headers (2) + 0-based indexing  
      targetRowIndex = targetRowIndex + 3;
    }

    // Get headers to find the column for the field (row 2, not row 1)
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'BASE!2:2',
    });

    const headers = headersResponse.data.values?.[0] || [];
    const columnIndex = headers.findIndex(header => 
      header?.toLowerCase().trim() === field.toLowerCase().trim()
    );

    if (columnIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Field '${field}' not found in sheet headers` },
        { status: 400 }
      );
    }

    // Convert column index to letter (A, B, C, etc.)
    const columnLetter = String.fromCharCode(65 + columnIndex);
    const cellRange = `BASE!${columnLetter}${targetRowIndex}`;

    // Update the specific cell
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: cellRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[value]],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${field} for IMEI ${imei}`,
      updatedCell: cellRange,
      updatedValue: value,
    });

  } catch (error) {
    console.error('Error updating record:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: `Failed to update record: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: { imei: string; updates: Record<string, string> } = await request.json();
    const { imei, updates } = body;

    if (!imei || !updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imei, updates' },
        { status: 400 }
      );
    }

    const sheets = await getGoogleSheetsAuth();

    // Get all data to find the row and headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'BASE!A:N',
    });

    const data = response.data.values || [];
    const [headers, ...rows] = data;
    
    const imeiColumnIndex = headers?.findIndex(header => 
      header?.toLowerCase().trim() === 'imei'
    );

    if (imeiColumnIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'IMEI column not found in sheet' },
        { status: 400 }
      );
    }

    const rowIndex = rows.findIndex(row => row[imeiColumnIndex] === imei);
    
    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'IMEI record not found' },
        { status: 404 }
      );
    }

    // Prepare batch update
    const updateRequests = [];
    const targetRowIndex = rowIndex + 3; // Account for extra header row (1) + real headers (2) + 0-based indexing

    for (const [field, value] of Object.entries(updates)) {
      const columnIndex = headers.findIndex(header => 
        header?.toLowerCase().trim() === field.toLowerCase().trim()
      );

      if (columnIndex !== -1) {
        const columnLetter = String.fromCharCode(65 + columnIndex);
        updateRequests.push({
          range: `BASE!${columnLetter}${targetRowIndex}`,
          values: [[value]],
        });
      }
    }

    if (updateRequests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Batch update all fields
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: updateRequests,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${updateRequests.length} fields for IMEI ${imei}`,
      updatedFields: Object.keys(updates),
    });

  } catch (error) {
    console.error('Error batch updating record:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: `Failed to batch update record: ${errorMessage}` },
      { status: 500 }
    );
  }
}