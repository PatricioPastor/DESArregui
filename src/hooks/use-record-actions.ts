import { useState, useCallback } from 'react';
import type { IMEIRecord } from '@/lib/types';

interface UpdateRecordParams {
  imei: string;
  field: keyof IMEIRecord;
  value: string;
}

interface BatchUpdateParams {
  imei: string;
  updates: Partial<IMEIRecord>;
}

interface UseRecordActionsReturn {
  updateRecord: (params: UpdateRecordParams) => Promise<boolean>;
  batchUpdateRecord: (params: BatchUpdateParams) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

export function useRecordActions(): UseRecordActionsReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRecord = useCallback(async ({ imei, field, value }: UpdateRecordParams): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/update-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imei,
          field,
          value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update record');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error updating record:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const batchUpdateRecord = useCallback(async ({ imei, updates }: BatchUpdateParams): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/update-record', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imei,
          updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to batch update record');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Batch update failed');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error batch updating record:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateRecord,
    batchUpdateRecord,
    isUpdating,
    error,
  };
}

// Hook for optimistic updates with local state management
export function useOptimisticRecordActions(
  data: IMEIRecord[],
  onDataChange: (newData: IMEIRecord[]) => void
) {
  const { updateRecord, batchUpdateRecord, isUpdating, error } = useRecordActions();

  const optimisticUpdate = useCallback(async ({ imei, field, value }: UpdateRecordParams): Promise<boolean> => {
    // Find the record to update
    const recordIndex = data.findIndex(record => record.imei === imei);
    if (recordIndex === -1) {
      console.error('Record not found for optimistic update');
      return false;
    }

    // Store original data for rollback
    const originalData = [...data];
    const originalRecord = { ...data[recordIndex] };

    // Apply optimistic update to local state
    const updatedData = [...data];
    updatedData[recordIndex] = {
      ...updatedData[recordIndex],
      [field]: value,
    };
    
    onDataChange(updatedData);

    // Try to sync with server
    const success = await updateRecord({ imei, field, value });

    if (!success) {
      // Rollback on failure
      onDataChange(originalData);
      return false;
    }

    return true;
  }, [data, onDataChange, updateRecord]);

  const optimisticBatchUpdate = useCallback(async ({ imei, updates }: BatchUpdateParams): Promise<boolean> => {
    // Find the record to update
    const recordIndex = data.findIndex(record => record.imei === imei);
    if (recordIndex === -1) {
      console.error('Record not found for optimistic batch update');
      return false;
    }

    // Store original data for rollback
    const originalData = [...data];

    // Apply optimistic updates to local state
    const updatedData = [...data];
    updatedData[recordIndex] = {
      ...updatedData[recordIndex],
      ...updates,
    };
    
    onDataChange(updatedData);

    // Try to sync with server
    const success = await batchUpdateRecord({ imei, updates });

    if (!success) {
      // Rollback on failure
      onDataChange(originalData);
      return false;
    }

    return true;
  }, [data, onDataChange, batchUpdateRecord]);

  return {
    optimisticUpdate,
    optimisticBatchUpdate,
    isUpdating,
    error,
  };
}