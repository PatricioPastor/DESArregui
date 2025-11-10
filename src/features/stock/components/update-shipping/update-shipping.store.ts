import { create } from 'zustand';

interface AssignmentInfo {
  id: string;
  assignee_name: string;
  shipping_voucher_id: string | null;
  shipping_status: string | null;
}

interface UpdateShippingStore {
  // Estado del modal
  isLoading: boolean;
  error: string | null;
  assignmentInfo: AssignmentInfo | null;

  // Datos del formulario
  shippingStatus: string;
  shippingNotes: string;

  // Acciones
  setAssignmentInfo: (info: AssignmentInfo) => void;
  setShippingStatus: (status: string) => void;
  setShippingNotes: (notes: string) => void;

  // Acción para enviar
  updateShipping: () => Promise<{ success: boolean; message?: string }>;

  // Reset
  resetState: () => void;
}

export const useUpdateShippingStore = create<UpdateShippingStore>((set, get) => ({
  // Estado inicial
  isLoading: false,
  error: null,
  assignmentInfo: null,
  shippingStatus: 'pending',
  shippingNotes: '',

  // Manejo del formulario
  setAssignmentInfo: (info) => set({ assignmentInfo: info, shippingStatus: info.shipping_status || 'pending' }),

  setShippingStatus: (status) => set({ shippingStatus: status, error: null }),

  setShippingNotes: (notes) => set({ shippingNotes: notes, error: null }),

  // Actualizar estado de envío
  updateShipping: async () => {
    const { assignmentInfo, shippingStatus, shippingNotes } = get();

    if (!assignmentInfo) {
      return {
        success: false,
        message: 'No se ha seleccionado ninguna asignación'
      };
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/assignments/${assignmentInfo.id}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipping_status: shippingStatus,
          shipping_notes: shippingNotes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el estado de envío');
      }

      set({ isLoading: false });

      return {
        success: true,
        message: result.message || 'Estado de envío actualizado exitosamente'
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
      shippingStatus: 'pending',
      shippingNotes: '',
    });
  },
}));
