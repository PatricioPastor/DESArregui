import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { TelefonosTicketRecord } from '@/lib/types';
import { parse, parseISO, isValid } from 'date-fns';
import { getTelefonosTicketsSheetData, convertRowToTelefonosTicketRecord } from '@/lib/telefonos-tickets-sheets';

interface SyncRequest {
  tickets?: TelefonosTicketRecord[];
}

interface SyncResponse {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: number;
  error?: string;
  details?: {
    errors: Array<{
      ticket: Partial<TelefonosTicketRecord>;
      error: string;
    }>;
  };
}

const SHEET_SYNC_DATE_PATTERNS = [
  'd/M/yyyy H:mm:ss',
  'd/M/yyyy HH:mm:ss',
  'd/M/yyyy H:mm',
  'd/M/yyyy HH:mm',
  'dd/MM/yyyy H:mm:ss',
  'dd/MM/yyyy HH:mm:ss',
  'dd/MM/yyyy H:mm',
  'dd/MM/yyyy HH:mm',
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-dd',
];

// Extract replacement count from title (R-1, R-2, etc.) for delivered phones
const extractReplacementInfo = (title: string) => {
  const match = title.match(/R-(\d+)/i);
  return {
    isReplacement: !!match,
    replacementCount: match ? parseInt(match[1], 10) : null,
  };
};

// Extract pending count from title (P-1, P-2, etc.) for pending delivery phones
const extractPendingInfo = (title: string) => {
  const match = title.match(/P-(\d+)/i);
  return {
    isPending: !!match,
    pendingCount: match ? parseInt(match[1], 10) : null,
  };
};

// Determine if ticket is assignment type (supports semicolon-separated labels)
const isAssignmentTicket = (label: string) => {
  return label.includes('ASG-CEL');
};

// Determine if ticket is replacement type (supports semicolon-separated labels)
const isReplacementTicket = (label: string) => {
  return label.includes('REC-CEL');
};

// Parse date strings coming from the spreadsheet into Date objects
const parseSheetDate = (dateString: string) => {
  if (!dateString || typeof dateString !== 'string') {
    return new Date();
  }

  const trimmed = dateString.trim();

  for (const pattern of SHEET_SYNC_DATE_PATTERNS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const isoParsed = parseISO(trimmed);
  if (isValid(isoParsed)) {
    return isoParsed;
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  console.warn('Unable to parse sheet date:', dateString);
  return new Date();
};

// Map TelefonosTicketRecord to database fields
const mapTicketRecordToDB = (record: TelefonosTicketRecord) => {
  const { isReplacement, replacementCount } = extractReplacementInfo(record.title);
  const { isPending, pendingCount } = extractPendingInfo(record.title);
  const isAssignment = isAssignmentTicket(record.label);
  const isReplacementLabel = isReplacementTicket(record.label);

  // Business rule: A ticket is EITHER assignment OR replacement, never both
  const finalIsAssignment = isAssignment;
  const finalIsReplacement = finalIsAssignment ? false : (isReplacement || isReplacementLabel);

  return {
    issue_type: record.issue_type || '',
    key: record.key || '',
    title: record.title || '',
    label: record.label || '',
    enterprise: record.enterprise || '',
    created: parseSheetDate(record.created),
    updated: parseSheetDate(record.updated),
    creator: record.creator || 'Unknown',
    status: record.status || 'Unknown',
    category_status: record.category_status || 'Unknown',
    replacement_count: replacementCount,
    pending_count: pendingCount,
    is_replacement: finalIsReplacement,
    is_assignment: finalIsAssignment,
    is_active: true,
    last_sync: new Date(),
  };
};

const upsertTicket = async (record: TelefonosTicketRecord) => {
  const dbData = mapTicketRecordToDB(record);

  // Use upsert to handle both insert and update cases
  return await prisma.ticket.upsert({
    where: {
      key: record.key,
    },
    update: {
      ...dbData,
      updated_at: new Date(),
    },
    create: dbData,
  });
};

export async function POST(request: NextRequest) {
  try {
    let providedTicketsCount = 0;
    try {
      const payload = (await request.json()) as SyncRequest;
      if (Array.isArray(payload?.tickets)) {
        providedTicketsCount = payload.tickets.length;
      }
    } catch (error) {
      // El body puede estar vacío o no ser JSON; ignoramos el error porque usaremos los datos de Sheets.
    }

    const sheetData = await getTelefonosTicketsSheetData();
    const ticketsFromSheet = sheetData.rows
      .map((row:any) => convertRowToTelefonosTicketRecord(row, sheetData.headers))
      .filter((ticket:any) => ticket.key && ticket.title);

    if (providedTicketsCount && providedTicketsCount !== ticketsFromSheet.length) {
      console.info(
        `[tickets-sync] Se recibieron ${providedTicketsCount} tickets por body pero se usarán ${ticketsFromSheet.length} filas de Sheets.`
      );
    }

    if (ticketsFromSheet.length === 0) {
      return NextResponse.json<SyncResponse>(
        {
          success: false,
          processed: 0,
          created: 0,
          updated: 0,
          deactivated: 0,
          errors: 1,
          error: 'No se encontraron tickets en la hoja TELEFONOS_TICKETS',
        },
        { status: 400 }
      );
    }

    const tickets = ticketsFromSheet;

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: 0,
      errorDetails: [] as Array<{ ticket: Partial<TelefonosTicketRecord>; error: string }>,
    };

    // Get all current keys from incoming data
    const incomingKeys = tickets.map((t:any) => t.key).filter(Boolean);

    // Mark tickets as inactive if they're not in the incoming data
    if (incomingKeys.length > 0) {
      const deactivatedTickets = await prisma.ticket.updateMany({
        where: {
          key: { notIn: incomingKeys },
          is_active: true,
        },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });
      results.deactivated = deactivatedTickets.count;
    }

    // Process tickets in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      batches.push(tickets.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (ticket:any) => {
        try {
          // Validation
          if (!ticket.key || !ticket.title) {
            throw new Error('Key and title are required');
          }

          // Check if ticket already exists to determine if it's an update
          const existingTicket = await prisma.ticket.findUnique({
            where: { key: ticket.key },
          });

          await upsertTicket(ticket);

          results.processed++;
          if (existingTicket) {
            results.updated++;
          } else {
            results.created++;
          }

          return { success: true };
        } catch (error) {
          results.errors++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errorDetails.push({
            ticket: {
              key: ticket.key,
              title: ticket.title,
            },
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(batchPromises);
    }

    const response: SyncResponse = {
      success: results.errors === 0,
      processed: results.processed,
      created: results.created,
      updated: results.updated,
      deactivated: results.deactivated,
      errors: results.errors,
    };

    // Include error details if there were errors
    if (results.errors > 0) {
      response.details = {
        errors: results.errorDetails,
      };
    }

    const statusCode = results.errors === 0 ? 200 : 207; // 207 = Multi-Status

    return NextResponse.json<SyncResponse>(response, { status: statusCode });

  } catch (error) {
    console.error('Tickets sync error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json<SyncResponse>(
      {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        errors: 1,
        error: `Failed to sync tickets: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}