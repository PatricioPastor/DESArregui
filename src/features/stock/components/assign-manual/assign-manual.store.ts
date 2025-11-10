import { create } from 'zustand';

interface ManualAssignmentFormData {
  assignee_name: string;
  assignee_phone: string;
  distributor_id: string;
  delivery_location: string;
  contact_details: string;
  generate_voucher: boolean;
  expects_return: boolean;
  return_device_imei: string;
}

interface DistributorOption {
  id: string;
  label: string;
  supportingText?: string;
}

interface DeviceInfo {
  id: string;
  imei: string;
  modelo: string;
  status: string;
}

interface AssignManualStore {
  // Estado del modal
  isLoading: boolean;
  error: string | null;
  deviceInfo: DeviceInfo | null;
  currentStep: number;

  // Datos del formulario
  formData: ManualAssignmentFormData;

  // Opciones para los selects
  distributorOptions: DistributorOption[];
  isLoadingOptions: boolean;

  // Acciones para el formulario
  setFormData: (data: Partial<ManualAssignmentFormData>) => void;
  setDeviceInfo: (info: DeviceInfo) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Acciones para cargar datos
  fetchDistributorOptions: () => Promise<void>;

  // Acción para enviar
  submit: () => Promise<{ success: boolean; message?: string; data?: any }>;

  // Reset
  resetState: () => void;
}

const initialFormData: ManualAssignmentFormData = {
  assignee_name: '',
  assignee_phone: '',
  distributor_id: '',
  delivery_location: '',
  contact_details: '',
  generate_voucher: false,
  expects_return: false,
  return_device_imei: '',
};

const TOTAL_STEPS = 3;

export const useAssignManualStore = create<AssignManualStore>((set, get) => ({
  // Estado inicial
  isLoading: false,
  error: null,
  deviceInfo: null,
  currentStep: 1,
  formData: initialFormData,
  distributorOptions: [],
  isLoadingOptions: false,

  // Manejo del formulario
  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
      error: null,
    }));
  },

  setDeviceInfo: (info) => set({ deviceInfo: info }),

  setCurrentStep: (step) =>
    set(() => ({
      currentStep: Math.min(Math.max(step, 1), TOTAL_STEPS),
    })),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS),
    })),

  previousStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1),
    })),

  // Cargar opciones de distribuidoras
  fetchDistributorOptions: async () => {
    set({ isLoadingOptions: true });
    try {
      const response: any = await fetch('/api/distributors');
      const res = await response.json();
      if (!res.data) throw new Error('Error al cargar distribuidoras');

      const distributors = res.data;
      const options = distributors.map((dist: any) => ({
        id: dist.id,
        label: dist.name,
        supportingText: dist.devices_count ? `${dist.devices_count} dispositivos` : undefined,
      }));

      set({ distributorOptions: options, isLoadingOptions: false });
    } catch (error) {
      console.error('Error fetching distributors:', error);
      set({
        distributorOptions: [],
        isLoadingOptions: false,
        error: 'Error al cargar las distribuidoras'
      });
    }
  },

  // Enviar asignación manual
  submit: async () => {
    const { deviceInfo, formData } = get();

    if (!deviceInfo) {
      return {
        success: false,
        message: 'No se ha seleccionado ningún dispositivo'
      };
    }

    // Validar campos obligatorios
    if (!formData.assignee_name.trim() ||
        !formData.assignee_phone.trim() ||
        !formData.distributor_id ||
        !formData.delivery_location.trim()) {
      return {
        success: false,
        message: 'Por favor complete todos los campos obligatorios'
      };
    }

    // Validar IMEI de devolución si es necesario
    if (formData.expects_return && !formData.return_device_imei.trim()) {
      return {
        success: false,
        message: 'Por favor ingrese el IMEI del dispositivo a devolver'
      };
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/assignments/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceInfo.id,
          ...formData,
          return_device_imei: formData.expects_return ? formData.return_device_imei : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la asignación');
      }

      set({ isLoading: false });

      return {
        success: true,
        message: result.message || 'Asignación creada exitosamente',
        data: result.data
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
      currentStep: 1,
      formData: initialFormData,
    });
  },
}));
