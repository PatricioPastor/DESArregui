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
  invalid_labels: number;
  error?: string;
  details?: {
    errors: Array<{
      ticket: Partial<TelefonosTicketRecord>;
      error: string;
    }>;
    invalid_labels: Array<{
      key: string;
      label: string;
      reason: string;
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

// Valid replacement types (strict validation)
const VALID_REPLACEMENT_TYPES = ['ROBO', 'ROTURA', 'OBSOLETO', 'PERDIDA'] as const;
const VALID_LABEL_TAGS = [...VALID_REPLACEMENT_TYPES, 'ASG-CEL', 'REC-CEL'] as const;

// Extract replacement type from label with strict validation
const extractReplacementType = (label: string): {
  replacementType: string | null;
  hasInvalidLabels: boolean;
  invalidTags: string[];
} => {
  if (!label || label.trim() === '') {
    return { replacementType: null, hasInvalidLabels: false, invalidTags: [] };
  }

  // If it's an assignment, no replacement type
  if (label.includes('ASG-CEL')) {
    return { replacementType: null, hasInvalidLabels: false, invalidTags: [] };
  }

  // If it's not a replacement, no replacement type
  if (!label.includes('REC-CEL')) {
    return { replacementType: null, hasInvalidLabels: false, invalidTags: [] };
  }

  // Split by semicolon and trim
  const tags = label.split(';').map(t => t.trim()).filter(t => t !== '');

  // Check for invalid tags
  const invalidTags = tags.filter(tag => !VALID_LABEL_TAGS.includes(tag as any));
  const hasInvalidLabels = invalidTags.length > 0;

  // Find replacement type (any tag that is NOT REC-CEL and IS in valid types)
  const replacementType = tags.find(tag =>
    tag !== 'REC-CEL' && VALID_REPLACEMENT_TYPES.includes(tag as any)
  );

  return {
    replacementType: replacementType || 'SIN_ESPECIFICAR',
    hasInvalidLabels,
    invalidTags
  };
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
  const { replacementType, hasInvalidLabels, invalidTags } = extractReplacementType(record.label);

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
    replacement_type: replacementType,
    is_replacement: finalIsReplacement,
    is_assignment: finalIsAssignment,
    is_active: true,
    last_sync: new Date(),
    hasInvalidLabels,
    invalidTags,
  };
};

const upsertTicket = async (record: TelefonosTicketRecord) => {
  const mappedData = mapTicketRecordToDB(record);

  // Extract validation fields (not stored in DB)
  const { hasInvalidLabels, invalidTags, ...dbData } = mappedData;

  // Use upsert to handle both insert and update cases
  const result = await prisma.ticket.upsert({
    where: {
      key: record.key,
    },
    update: {
      ...dbData,
      updated_at: new Date(),
    },
    create: dbData,
  });

  return { result, hasInvalidLabels, invalidTags };
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
      invalid_labels: 0,
      errorDetails: [] as Array<{ ticket: Partial<TelefonosTicketRecord>; error: string }>,
      invalidLabelDetails: [] as Array<{ key: string; label: string; reason: string }>,
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

          const { hasInvalidLabels, invalidTags } = await upsertTicket(ticket);

          // Track invalid labels
          if (hasInvalidLabels && invalidTags.length > 0) {
            results.invalid_labels++;
            results.invalidLabelDetails.push({
              key: ticket.key,
              label: ticket.label,
              reason: `Invalid tags found: ${invalidTags.join(', ')}. Valid tags are: ${VALID_LABEL_TAGS.join(', ')}`,
            });
          }

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
      invalid_labels: results.invalid_labels,
    };

    // Include error details if there were errors or invalid labels
    if (results.errors > 0 || results.invalid_labels > 0) {
      response.details = {
        errors: results.errorDetails,
        invalid_labels: results.invalidLabelDetails,
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
        invalid_labels: 0,
        error: `Failed to sync tickets: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}