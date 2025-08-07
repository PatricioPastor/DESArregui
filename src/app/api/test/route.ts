import { NextResponse } from 'next/server';

export async function GET() {
  // Test endpoint to verify API is working and environment variables are accessible
  try {
    const hasGoogleClientEmail = !!process.env.GOOGLE_CLIENT_EMAIL;
    const hasGooglePrivateKey = !!process.env.GOOGLE_PRIVATE_KEY;
    const hasGoogleSheetId = !!process.env.GOOGLE_SHEET_ID;

    return NextResponse.json({
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasGoogleClientEmail,
        hasGooglePrivateKey,
        hasGoogleSheetId,
        googleClientEmail: hasGoogleClientEmail ? process.env.GOOGLE_CLIENT_EMAIL?.substring(0, 20) + '...' : 'Not set',
        nodeEnv: process.env.NODE_ENV,
      },
      nextSteps: hasGoogleClientEmail && hasGooglePrivateKey && hasGoogleSheetId 
        ? 'All environment variables are set. Try /api/base to fetch sheet data.'
        : 'Missing environment variables. Check .env.local configuration.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}