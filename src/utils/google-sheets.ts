// utils/googleSheets.ts
import { google } from 'googleapis';
import type { SheetDataRaw } from './types';

export async function getGoogleSheetsAuth(writePermissions = false) {
  const scopes = writePermissions
    ? ['https://www.googleapis.com/auth/spreadsheets']
    : ['https://www.googleapis.com/auth/spreadsheets.readonly'];

  try {
    const auth = await google.auth.getClient({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes,
    });
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error authenticating with Google Sheets:', error);
    throw new Error('Failed to authenticate with Google Sheets API');
  }
}

export async function getTelefonosTicketsSheetData(range = 'TELEFONOS_TICKETS!A:J'): Promise<SheetDataRaw> {
  try {
    const sheets = await getGoogleSheetsAuth();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    const data = response.data.values || [];
    if (data.length < 1) {
      return { headers: [], rows: [], totalRecords: 0, lastUpdated: new Date().toISOString() };
    }

    const [headers, ...rows] = data;
    return {
      headers: headers as string[],
      rows: rows as string[][],
      totalRecords: rows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching TELEFONOS_TICKETS sheet data:', error);
    throw error;
  }
}