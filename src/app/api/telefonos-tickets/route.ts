import { NextRequest, NextResponse } from 'next/server';
import { 
  getTelefonosTicketRecords,
  calculateTelefonosTicketsAnalytics,
  getTelefonosTicketsFilterOptions 
} from '@/lib/telefonos-tickets-sheets';
import type { TelefonosTicketsResponse, TelefonosTicketsFilters } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting TELEFONOS_TICKETS API request...');
    
    // Parse URL search parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filters: TelefonosTicketsFilters = {};
    
    // Date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }
    
    // Multi-select filters
    const enterprises = searchParams.get('enterprises');
    if (enterprises) {
      filters.enterprise = enterprises.split(',').map(e => e.trim());
    }
    
    const issueTypes = searchParams.get('issueTypes');
    if (issueTypes) {
      filters.issueType = issueTypes.split(',').map(t => t.trim());
    }
    
    const labels = searchParams.get('labels');
    if (labels) {
      filters.label = labels.split(',').map(l => l.trim());
    }
    
    // Search keyword
    const searchKeyword = searchParams.get('search');
    if (searchKeyword) {
      filters.searchKeyword = searchKeyword;
    }
    
    // Fetch all ticket records from Google Sheets
    console.log('Fetching TELEFONOS_TICKETS records...');
    const records = await getTelefonosTicketRecords();
    console.log(`Retrieved ${records.length} ticket records`);
    
    // Calculate analytics with filters applied
    console.log('Calculating analytics with filters:', filters);
    const analytics = calculateTelefonosTicketsAnalytics(records, filters);
    
    // Get filter options for dropdowns
    const filterOptions = getTelefonosTicketsFilterOptions(records);
    
    const response: TelefonosTicketsResponse = {
      success: true,
      data: records,
      totalRecords: records.length,
      analytics,
      lastUpdated: new Date().toISOString(),
      headers: ['issue_type', 'key', 'title', 'label', 'enterprise', 'created', 'updated'],
      ...filterOptions
    };
    
    console.log('TELEFONOS_TICKETS API response ready:', {
      totalRecords: records.length,
      analyticsIncluded: !!analytics,
      filtersApplied: Object.keys(filters).length > 0
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in TELEFONOS_TICKETS API:', error);
    
    const errorResponse: TelefonosTicketsResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: [],
      totalRecords: 0
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Processing TELEFONOS_TICKETS POST request...');
    
    const body = await request.json();
    const { filters } = body as { filters: TelefonosTicketsFilters };
    
    // Fetch all ticket records
    const records = await getTelefonosTicketRecords();
    
    // Calculate analytics with provided filters
    const analytics = calculateTelefonosTicketsAnalytics(records, filters);
    
    const response: TelefonosTicketsResponse = {
      success: true,
      data: records,
      totalRecords: records.length,
      analytics,
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in TELEFONOS_TICKETS POST:', error);
    
    const errorResponse: TelefonosTicketsResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: [],
      totalRecords: 0
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}