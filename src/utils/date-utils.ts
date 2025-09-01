// utils/dateUtils.ts
import { format, parse } from 'date-fns';

/**
 * Helper function to normalize date format from DD/MM/YYYY HH:mm:ss to ISO string
 */
export function normalizeDateString(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  try {
    // Check if it's already in ISO format or similar
    if (dateString.includes('-') && dateString.length >= 10) {
      return dateString;
    }

    // Parse DD/MM/YYYY HH:mm:ss format
    // Example: "31/05/2024 14:55:20"
    const parsed = parse(dateString, 'dd/MM/yyyy HH:mm:ss', new Date());
    
    if (isNaN(parsed.getTime())) {
      // Try without time part: DD/MM/YYYY
      const parsedDateOnly = parse(dateString, 'dd/MM/yyyy', new Date());
      if (!isNaN(parsedDateOnly.getTime())) {
        return format(parsedDateOnly, 'yyyy-MM-dd');
      }
      console.warn('Unable to parse date:', dateString);
      return dateString; // Return original if can't parse
    }

    return format(parsed, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.warn('Error normalizing date:', dateString, error);
    return dateString; // Return original if error
  }
}

/**
 * Get monthly key for aggregating data by month
 */
export function getMonthlyKey(date: Date): string {
  return format(date, 'yyyy-MM');
}