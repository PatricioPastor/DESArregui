import { create } from "zustand";

interface AssignmentInfo {
  id: string;
  assignee_name: string;
  return_device_imei: string;
  at: string;
}

interface RegisterReturnStore {
  isLoading: boolean;
  error: string | null;
  assignmentInfo: AssignmentInfo | null;
  returnReceived: boolean;
  returnNotes: string;

  setAssignmentInfo: (info: AssignmentInfo) => void;
  setReturnReceived: (received: boolean) => void;
  setReturnNotes: (notes: string) => void;
  registerReturn: () => Promise<{ success: boolean; message?: string }>;
  resetState: () => void;
}

export const useRegisterReturnStore = create<RegisterReturnStore>((set, get) => ({
  isLoading: false,
  error: null,
  assignmentInfo: null,
  returnReceived: false,
  returnNotes: "",

  setAssignmentInfo: (info) => set({ assignmentInfo: info }),
  setReturnReceived: (received) => set({ returnReceived: received }),
  setReturnNotes: (notes) => set({ returnNotes: notes }),

  registerReturn: async () => {
    const { assignmentInfo, returnReceived, returnNotes } = get();

    if (!assignmentInfo) {
      set({ error: "No hay información de asignación" });
      return { success: false, message: "No hay información de asignación" };
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/assignments/${assignmentInfo.id}/return`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_received: returnReceived,
          return_notes: returnNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || "Error al registrar devolución" });
        return { success: false, message: data.error };
      }

      set({ isLoading: false });
      return { success: true, message: data.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      set({ error: errorMessage, isLoading: false });
      return { success: false, message: errorMessage };
    }
  },

  resetState: () =>
    set({
      isLoading: false,
      error: null,
      assignmentInfo: null,
      returnReceived: false,
      returnNotes: "",
    }),
}));
