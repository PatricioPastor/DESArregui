import { create } from 'zustand';

interface AssignmentInfo {
  id: string;
  assignee_name: string;
  at: string;
}

interface CloseAssignmentStore {
  // Estado del modal
  isLoading: boolean;
  error: string | null;
  assignmentInfo: AssignmentInfo | null;

  // Datos del formulario
  closureReason: string;
  deviceReturned: boolean;

  // Acciones
  setAssignmentInfo: (info: AssignmentInfo) => void;
  setClosureReason: (reason: string) => void;
  setDeviceReturned: (returned: boolean) => void;

  // Acción para enviar
  closeAssignment: () => Promise<{ success: boolean; message?: string }>;

  // Reset
  resetState: () => void;
}

export const useCloseAssignmentStore = create<CloseAssignmentStore>((set, get) => ({
  // Estado inicial
  isLoading: false,
  error: null,
  assignmentInfo: null,
  closureReason: '',
  deviceReturned: false,

  // Manejo del formulario
  setAssignmentInfo: (info) => set({ assignmentInfo: info }),

  setClosureReason: (reason) => set({ closureReason: reason, error: null }),

  setDeviceReturned: (returned) => set({ deviceReturned: returned, error: null }),

  // Cerrar asignación
  closeAssignment: async () => {
    const { assignmentInfo, closureReason, deviceReturned } = get();

    if (!assignmentInfo) {
      return {
        success: false,
        message: 'No se ha seleccionado ninguna asignación'
      };
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/assignments/${assignmentInfo.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: closureReason.trim() || null,
          device_returned: deviceReturned,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cerrar la asignación');
      }

      set({ isLoading: false });

      return {
        success: true,
        message: result.message || 'Asignación cerrada exitosamente'
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
      assignmentInfo: null,
      closureReason: '',
      deviceReturned: false,
    });
  },
}));
