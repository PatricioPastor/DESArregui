import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { TelefonosTicketsResponse, TelefonosTicketsFilters } from '@/lib/types';
import { calculateTelefonosTicketsAnalytics, getTelefonosTicketRecords } from '@/lib/telefonos-tickets-sheets';

// Calculate analytics from database tickets
const calculateAnalytics = (tickets: any[], filters: TelefonosTicketsFilters) => {
  // Apply filters
  let filteredTickets = tickets;

  if (filters.dateRange) {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    filteredTickets = filteredTickets.filter(ticket => {
      const ticketDate = new Date(ticket.created);
      return ticketDate >= startDate && ticketDate <= endDate;
    });
  }

  if (filters.enterprise) {
    filteredTickets = filteredTickets.filter(ticket =>
      filters.enterprise!.includes(ticket.enterprise)
    );
  }

  if (filters.issueType) {
    filteredTickets = filteredTickets.filter(ticket =>
      filters.issueType!.includes(ticket.issue_type)
    );
  }

  if (filters.label) {
    filteredTickets = filteredTickets.filter(ticket =>
      filters.label!.includes(ticket.label)
    );
  }

  if (filters.searchKeyword) {
    const search = filters.searchKeyword.toLowerCase();
    filteredTickets = filteredTickets.filter(ticket =>
      ticket.title.toLowerCase().includes(search) ||
      ticket.key.toLowerCase().includes(search) ||
      ticket.creator.toLowerCase().includes(search)
    );
  }

  // Calculate analytics
  const totalTickets = filteredTickets.length;

  const byEnterprise = filteredTickets.reduce((acc, ticket) => {
    acc[ticket.enterprise] = (acc[ticket.enterprise] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byIssueType = filteredTickets.reduce((acc, ticket) => {
    acc[ticket.issue_type] = (acc[ticket.issue_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byLabel = filteredTickets.reduce((acc, ticket) => {
    acc[ticket.label] = (acc[ticket.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generate simple time series data (group by month)
  const timeSeriesData = filteredTickets.reduce((acc, ticket) => {
    const date = new Date(ticket.created);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = acc.find((item:any) => item.date === monthKey);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ date: monthKey, count: 1 });
    }
    return acc;
  }, [] as Array<{ date: string; count: number }>);

  // Calculate replacement types counts (only for replacement tickets)
  const replacementTickets = filteredTickets.filter(ticket => ticket.is_replacement);
  const replacementTypes = replacementTickets.reduce((acc, ticket) => {
    const type = ticket.replacement_type || 'SIN_ESPECIFICAR';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Initialize all valid types with 0 if not present
  const allReplacementTypes = {
    ROBO: replacementTypes.ROBO || 0,
    ROTURA: replacementTypes.ROTURA || 0,
    OBSOLETO: replacementTypes.OBSOLETO || 0,
    PERDIDA: replacementTypes.PERDIDA || 0,
    SIN_ESPECIFICAR: replacementTypes.SIN_ESPECIFICAR || 0,
  };

  // Simple demand projections based on replacement tickets
  const demandProjections = Object.keys(byEnterprise).map(enterprise => ({
    enterprise,
    currentDemand: replacementTickets.filter(t => t.enterprise === enterprise).length,
    projectedDemand: Math.ceil(replacementTickets.filter(t => t.enterprise === enterprise).length * 1.1),
    growthRate: 10,
    confidence: 'medium' as const,
    recommendations: ['Monitor demand trends', 'Maintain stock levels']
  }));

  return {
    totalTickets,
    byEnterprise,
    byIssueType,
    byLabel,
    replacement_types: allReplacementTypes,
    timeSeriesData,
    demandProjections,
    stockAnalysis: [],
    topIssues: Object.entries(byIssueType).map(([title, count]) => ({
      title,
      count,
      percentage: Math.round((10 / totalTickets) * 100)
    })).slice(0, 5)
  };
};

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

    // Fetch tickets from database
    console.log('Fetching tickets from database...');
    const tickets = await prisma.ticket.findMany({
      where: { is_active: true },
      orderBy: { created: 'desc' },
      take: 10000, // Reasonable limit
    });

    console.log(`Retrieved ${tickets.length} ticket records from database`);

    // Map database tickets to frontend format
    const mappedTickets = tickets.map(ticket => ({
      issue_type: ticket.issue_type,
      key: ticket.key,
      title: ticket.title,
      label: ticket.label,
      enterprise: ticket.enterprise,
      created: ticket.created.toISOString(),
      updated: ticket.updated.toISOString(),
      creator: ticket.creator,
      status: ticket.status,
      category_status: ticket.category_status,
    }));

    // Calculate analytics with filters applied
    console.log('Calculating analytics with filters:', filters);
    const analytics = calculateAnalytics(tickets, filters);

    
    

    const response: TelefonosTicketsResponse = {
      success: true,
      data: mappedTickets,
      totalRecords: mappedTickets.length,
      analytics: analytics as any,
      lastUpdated: tickets[0]?.last_sync?.toISOString() || new Date().toISOString(),
      headers: ['issue_type', 'key', 'title', 'label', 'enterprise', 'created', 'updated', 'creator', 'status', 'category_status'],
  
    };

    console.log('TELEFONOS_TICKETS API response ready:', {
      totalRecords: mappedTickets.length,
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