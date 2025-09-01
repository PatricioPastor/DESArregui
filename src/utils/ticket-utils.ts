// utils/ticketUtils.ts
import { normalizeDateString } from './date-utils';
import { TelefonosTicketRecord, TelefonosTicketsFilters } from './types';
import { parseISO, isAfter, isBefore } from 'date-fns';

export function convertRowToTelefonosTicketRecord(row: string[], headers: string[]): TelefonosTicketRecord {
  const record: Partial<TelefonosTicketRecord> = {};

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const value = row[index] || '';

    switch (normalizedHeader) {
      case 'issue_type':
      case 'issuetype':
      case 'tipo':
        record.issue_type = value;
        break;
      case 'key':
      case 'clave':
        record.key = value;
        break;
      case 'title':
      case 'titulo':
      case 'título':
        record.title = value;
        break;
      case 'label':
      case 'etiqueta':
        record.label = value;
        break;
      case 'enterprise':
      case 'empresa':
      case 'distribuidora':
        record.enterprise = value;
        break;
      case 'created':
      case 'creado':
      case 'fecha_creacion':
        record.created = normalizeDateString(value);
        break;
      case 'updated':
      case 'actualizado':
      case 'fecha_actualizacion':
        record.updated = normalizeDateString(value);
        break;
      default:
        console.log(`Unmapped header: "${header}"`);
        break;
    }
  });

  return {
    issue_type: record.issue_type || '',
    key: record.key || '',
    title: record.title || '',
    label: record.label || '',
    enterprise: record.enterprise || '',
    created: record.created || '',
    updated: record.updated || '',
  };
}

export function filterTelefonosTickets(
  records: TelefonosTicketRecord[],
  filters: TelefonosTicketsFilters
): TelefonosTicketRecord[] {
  return records.filter((record) => {
    if (filters.dateRange) {
      try {
        const recordDate = parseISO(record.created.includes(' ') ? record.created.split(' ')[0] : record.created);
        const startDate = parseISO(filters.dateRange.start);
        const endDate = parseISO(filters.dateRange.end);
        if (isBefore(recordDate, startDate) || isAfter(recordDate, endDate)) return false;
      } catch (error) {
        console.warn('Error parsing date for record:', record.key, error);
        return false;
      }
    }

    if (filters.enterprise?.length && !filters.enterprise.includes(record.enterprise)) return false;
    if (filters.issueType?.length && !filters.issueType.includes(record.issue_type)) return false;
    if (filters.label?.length && !filters.label.includes(record.label)) return false;

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      const searchableText = [
        record.title,
        record.key,
        record.label,
        record.enterprise,
        record.issue_type,
      ].join(' ').toLowerCase();
      if (!searchableText.includes(keyword)) return false;
    }

    return true;
  });
}