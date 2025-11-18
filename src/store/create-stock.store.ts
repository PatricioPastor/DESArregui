import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type StockCreationMode = 'individual' | 'bulk';

interface SelectOption {
  value: string;
  label: string;
  id?: string;
  [key: string]: any;
}

interface IndividualStockData {
  imei: string;
  modelo: string;
  distribuidora: string;
  asignado_a?: string;
  ticket?: string;
  status: string;
  purchase_id?: string;
  is_backup?: boolean;
  backup_distributor_id?: string;
}

interface BulkStockData {
  modelo: string;
  distribuidora: string;
  imeis: string[];
  asignado_a?: string;
  ticket?: string;
  status: string;
  purchase_id?: string;
  is_backup?: boolean;
  backup_distributor_id?: string;
}

interface CreateStockState {
  // UI State
  activeStep: StockCreationMode;
  isLoading: boolean;

  // Individual stock data
  individualData: IndividualStockData;

  // Bulk stock data
  bulkData: BulkStockData;

  // Select options
  modelOptions: SelectOption[];
  distributorOptions: SelectOption[];
  isLoadingOptions: boolean;

  // Actions
  setActiveStep: (step: StockCreationMode) => void;
  setIndividualData: (data: Partial<IndividualStockData>) => void;
  setBulkData: (data: Partial<BulkStockData>) => void;
  setBulkImeis: (imeis: string[]) => void;
  addBulkImei: (imei: string) => void;
  removeBulkImei: (index: number) => void;
  resetState: () => void;
  submit: () => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  fetchModelOptions: () => Promise<void>;
  fetchDistributorOptions: () => Promise<void>;
  fetchAllOptions: () => Promise<void>;
}

const initialIndividualData: IndividualStockData = {
  imei: '',
  modelo: '',
  distribuidora: '',
  asignado_a: '',
  ticket: '',
  status: 'NEW',
  purchase_id: '',
};

const initialBulkData: BulkStockData = {
  modelo: '',
  distribuidora: '',
  imeis: [],
  asignado_a: '',
  ticket: '',
  status: 'NEW',
  purchase_id: '',
};

export const useCreateStockStore = create<CreateStockState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeStep: 'individual',
      isLoading: false,
      individualData: { ...initialIndividualData },
      bulkData: { ...initialBulkData },
      modelOptions: [],
      distributorOptions: [],
      isLoadingOptions: false,

      // Actions
      setActiveStep: (step) => set({ activeStep: step }),

      setIndividualData: (data) =>
        set((state) => ({
          individualData: { ...state.individualData, ...data }
        })),

      setBulkData: (data) =>
        set((state) => ({
          bulkData: { ...state.bulkData, ...data }
        })),

      setBulkImeis: (imeis) =>
        set((state) => ({
          bulkData: { ...state.bulkData, imeis }
        })),

      addBulkImei: (imei) =>
        set((state) => ({
          bulkData: {
            ...state.bulkData,
            imeis: [...state.bulkData.imeis, imei]
          }
        })),

      removeBulkImei: (index) =>
        set((state) => ({
          bulkData: {
            ...state.bulkData,
            imeis: state.bulkData.imeis.filter((_, i) => i !== index)
          }
        })),

      resetState: () =>
        set({
          activeStep: 'individual',
          isLoading: false,
          individualData: { ...initialIndividualData },
          bulkData: { ...initialBulkData }
        }),

      submit: async () => {
        const state = get();
        set({ isLoading: true });

        try {
          if (state.activeStep === 'individual') {
            // Validar que todos los campos requeridos estén completos
            if (!state.individualData.imei || !state.individualData.modelo || !state.individualData.distribuidora) {
              return {
                success: false,
                message: 'Por favor complete todos los campos obligatorios (IMEI, modelo y distribuidora)'
              };
            }

            // Validate backup fields
            if (state.individualData.is_backup && !state.individualData.backup_distributor_id) {
              return {
                success: false,
                message: 'Debe seleccionar una distribuidora de backup cuando el dispositivo es de backup'
              };
            }

            const deviceData = {
              imei: state.individualData.imei.trim(),
              modelo: state.individualData.modelo,
              distribuidora: state.individualData.distribuidora,
              asignado_a: state.individualData.asignado_a?.trim() || undefined,
              ticket: state.individualData.ticket?.trim() || undefined,
              status: state.individualData.status || 'NEW',
              purchase_id: state.individualData.purchase_id?.trim() || undefined,
              is_backup: state.individualData.is_backup || false,
              backup_distributor_id: state.individualData.backup_distributor_id || undefined,
            };

            // Submit individual stock
            const response = await fetch('/api/stock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(deviceData),
            });

            const result = await response.json();

            if (!response.ok) {
              return {
                success: false,
                message: result.error || 'Error al crear el dispositivo'
              };
            }

            // Reset form on success
            set((state) => ({
              individualData: { ...initialIndividualData }
            }));

            return {
              success: true,
              message: result.message || 'Dispositivo creado exitosamente'
            };
          } else {
            // Validar campos requeridos para bulk
            if (!state.bulkData.modelo || !state.bulkData.distribuidora) {
              return {
                success: false,
                message: 'Por favor complete el modelo y distribuidora para todos los dispositivos'
              };
            }

            if (state.bulkData.imeis.length === 0) {
              return {
                success: false,
                message: 'Debe agregar al menos un IMEI'
              };
            }

            // Submit bulk stock
            const errors: string[] = [];
            let successCount = 0;

            // Create each device individually
            for (const imei of state.bulkData.imeis) {
              if (!imei.trim()) continue;

              try {
                const deviceData = {
                  imei: imei.trim(),
                  modelo: state.bulkData.modelo,
                  distribuidora: state.bulkData.distribuidora,
                  asignado_a: state.bulkData.asignado_a?.trim() || undefined,
                  is_backup: state.bulkData.is_backup || false,
                  backup_distributor_id: state.bulkData.backup_distributor_id || undefined,
                  ticket: state.bulkData.ticket?.trim() || undefined,
                  status: state.bulkData.status || 'NEW',
                  purchase_id: state.bulkData.purchase_id?.trim() || undefined,
                };

                const response = await fetch('/api/stock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deviceData)
                });

                if (response.ok) {
                  successCount++;
                } else {
                  const result = await response.json();
                  errors.push(`IMEI ${imei}: ${result.error || 'Error desconocido'}`);
                }
              } catch (error) {
                errors.push(`IMEI ${imei}: Error de conexion`);
              }
            }

            // Reset form on success
            if (successCount > 0) {
              set((state) => ({
                bulkData: { ...initialBulkData }
              }));
            }

            return {
              success: successCount > 0,
              message: `${successCount} dispositivos creados exitosamente${errors.length > 0 ? ` (${errors.length} errores)` : ''}`,
              errors: errors.length > 0 ? errors : undefined
            };
          }
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Error desconocido'
          };
        } finally {
          set({ isLoading: false });
        }
      },

      fetchModelOptions: async () => {
        try {
          set({ isLoadingOptions: true });
          const response = await fetch('/api/models');
          const result = await response.json();

          if (result.success) {
            set({ modelOptions: result.data });
          }
        } catch (error) {
          console.error('Error fetching model options:', error);
        } finally {
          set({ isLoadingOptions: false });
        }
      },

      fetchDistributorOptions: async () => {
        try {
          set({ isLoadingOptions: true });
          const response = await fetch('/api/distributors');
          const result = await response.json();

          if (result.success) {
            set({ distributorOptions: result.data });
          }
        } catch (error) {
          console.error('Error fetching distributor options:', error);
        } finally {
          set({ isLoadingOptions: false });
        }
      },

      fetchAllOptions: async () => {
        try {
          set({ isLoadingOptions: true });
          const [modelsResponse, distributorsResponse] = await Promise.all([
            fetch('/api/models'),
            fetch('/api/distributors')
          ]);

          const [modelsResult, distributorsResult] = await Promise.all([
            modelsResponse.json(),
            distributorsResponse.json()
          ]);

          set({
            modelOptions: modelsResult.success ? modelsResult.data : [],
            distributorOptions: distributorsResult.success ? distributorsResult.data : []
          });
        } catch (error) {
          console.error('Error fetching options:', error);
        } finally {
          set({ isLoadingOptions: false });
        }
      }
    }),
    { name: 'create-stock-store' }
  )
);
