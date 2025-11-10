import { create } from 'zustand';

interface DeviceInfo {
  id: string;
  imei: string;
  modelo: string;
  status: string;
}

interface DeleteDeviceStore {
  // Estado del modal
  isLoading: boolean;
  error: string | null;
  deviceInfo: DeviceInfo | null;

  // Datos del formulario
  finalStatus: string | null; // null = mantener estado actual
  deletionReason: string;

  // Acciones
  setDeviceInfo: (info: DeviceInfo) => void;
  setFinalStatus: (status: string | null) => void;
  setDeletionReason: (reason: string) => void;

  // Acción para enviar
  deleteDevice: () => Promise<{ success: boolean; message?: string }>;

  // Reset
  resetState: () => void;
}

export const useDeleteDeviceStore = create<DeleteDeviceStore>((set, get) => ({
  // Estado inicial
  isLoading: false,
  error: null,
  deviceInfo: null,
  finalStatus: null,
  deletionReason: '',

  // Manejo del formulario
  setDeviceInfo: (info) => set({ deviceInfo: info }),

  setFinalStatus: (status) => set({ finalStatus: status, error: null }),

  setDeletionReason: (reason) => set({ deletionReason: reason, error: null }),

  // Eliminar dispositivo
  deleteDevice: async () => {
    const { deviceInfo, finalStatus, deletionReason } = get();

    if (!deviceInfo) {
      return {
        success: false,
        message: 'No se ha seleccionado ningún dispositivo'
      };
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/stock/${deviceInfo.imei}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: deletionReason.trim() || null,
          final_status: finalStatus || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el dispositivo');
      }

      set({ isLoading: false });

      return {
        success: true,
        message: result.message || 'Dispositivo eliminado exitosamente'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      set({ isLoading: false, error: errorMessage });
      return { success: false, message: errorMessage };
    }
  },

  // Reset del store
  resetState: () => {
    set({
      isLoading: false,
      error: null,
      deviceInfo: null,
      finalStatus: null,
      deletionReason: '',
    });
  },
}));
