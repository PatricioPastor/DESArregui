import { create } from 'zustand';

interface AssignmentFormData {
  assignment_type: "new" | "replacement";
  assignee_name: string;
  assignee_phone: string;
  assignee_email: string;
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

interface AssignDeviceStore {
  // Estado del modal
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  deviceId: string | null;
  deviceInfo: any | null; // Info del dispositivo seleccionado
  
  // Datos del formulario
  formData: AssignmentFormData;
  
  // Opciones para los selects
  distributorOptions: DistributorOption[];
  isLoadingOptions: boolean;
  
  // Acciones para navegación
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Acciones para el formulario
  setFormData: (data: Partial<AssignmentFormData>) => void;
  setDeviceId: (id: string) => void;
  setDeviceInfo: (info: any) => void;
  
  // Acciones para cargar datos
  fetchDistributorOptions: () => Promise<void>;
  
  // Acción para enviar
  submit: () => Promise<{ success: boolean; message?: string; data?: any }>;
  
  // Reset
  resetState: () => void;
}

const initialFormData: AssignmentFormData = {
  assignment_type: 'new',
  assignee_name: '',
  assignee_phone: '',
  assignee_email: '',
  distributor_id: '',
  delivery_location: '',
  contact_details: '',
  generate_voucher: false,
  expects_return: false,
  return_device_imei: '',
};

export const useAssignDeviceStore = create<AssignDeviceStore>((set, get) => ({
  // Estado inicial
  currentStep: 1,
  isLoading: false,
  error: null,
  deviceId: null,
  deviceInfo: null,
  formData: initialFormData,
  distributorOptions: [],
  isLoadingOptions: false,

  // Navegación entre pasos
  setCurrentStep: (step) => set({ currentStep: step }),
  
  nextStep: () => {
    const { currentStep, formData } = get();

    // Calcular el total de pasos dinámicamente
    const totalSteps = formData.assignment_type === "replacement" ? 4 : 3;

    // No validar en pasos 1 y 2 (tienen valores por defecto)
    // Validar solo en paso 3 (información de contacto)
    if (currentStep === 3) {
      if (!formData.assignee_name.trim() ||
          !formData.assignee_phone.trim() ||
          !formData.distributor_id ||
          !formData.delivery_location.trim()) {
        set({ error: 'Por favor complete todos los campos obligatorios' });
        return;
      }
    }

    if (currentStep < totalSteps) {
      set({ currentStep: currentStep + 1, error: null });
    }
  },
  
  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1, error: null });
    }
  },

  // Manejo del formulario
  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
      error: null,
    }));
  },

  setDeviceId: (id) => set({ deviceId: id }),
  
  setDeviceInfo: (info) => set({ deviceInfo: info }),

  // Cargar opciones de distribuidoras
  fetchDistributorOptions: async () => {
    set({ isLoadingOptions: true });
    try {
      const response:any = await fetch('/api/distributors');
      const res = await response.json()
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

  // Enviar asignación
  submit: async () => {
    const { deviceId, formData } = get();
    
    if (!deviceId) {
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
      const { deviceInfo } = get();

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          soti_device_id: deviceInfo?.soti_device_id || null,
          assignment_type: formData.assignment_type,
          assignee_name: formData.assignee_name,
          assignee_phone: formData.assignee_phone,
          assignee_email: formData.assignee_email || null,
          distributor_id: formData.distributor_id,
          delivery_location: formData.delivery_location,
          contact_details: formData.contact_details,
          generate_voucher: formData.generate_voucher,
          expects_return: formData.expects_return,
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
      currentStep: 1,
      isLoading: false,
      error: null,
      deviceId: null,
      deviceInfo: null,
      formData: initialFormData,
    });
  },
}));
