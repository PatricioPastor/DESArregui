"use client";

import { useState, memo, useCallback, useEffect } from "react";
import { X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
// import { Label } from "@/components/base/label/label";
import { Select} from "@/components/base/select/select";


import type { IMEIRecord } from "@/lib/types";
import { cx } from "@/utils/cx";
import { TextArea } from '@/components/base/textarea/textarea';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: IMEIRecord | null;
  onSave: (updates: Partial<IMEIRecord>) => Promise<boolean>;
  isLoading?: boolean;
}

const statusOptions = [
  { value: "Usando - Iniciar Emails", label: "Usando - Iniciar Emails" },
  { value: "Disponible", label: "Disponible" },
  { value: "En Reparación", label: "En Reparación" },
  { value: "Baja", label: "Baja" },
  { value: "Perdido", label: "Perdido" },
];

export const EditRecordModal = memo<EditRecordModalProps>(({ isOpen, onClose, record, onSave, isLoading }) => {
  const [formData, setFormData] = useState<Partial<IMEIRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when record changes
  useEffect(() => {
    if (record) {
      setFormData({
        status_asignación: record.status_asignación || "",
        ticket: record.ticket || "",
        observaciones: record.observaciones || "",
        linea_e_tarifacion: record.linea_e_tarifacion || "",
        plan_e_tarifación: record.plan_e_tarifación || "",
      });
    }
  }, [record]);

  const handleSave = useCallback(async () => {
    if (!record) return;
    
    setIsSaving(true);
    
    // Only include fields that have changed
    const updates: Partial<IMEIRecord> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const originalValue = record[key as keyof IMEIRecord] || "";
      if (value !== originalValue && value !== undefined) {
        updates[key as keyof IMEIRecord] = value as string;
      }
    });

    if (Object.keys(updates).length === 0) {
      onClose();
      setIsSaving(false);
      return;
    }

    const success = await onSave(updates);
    setIsSaving(false);
    
    if (success) {
      onClose();
    }
  }, [record, formData, onSave, onClose]);

  const handleFieldChange = useCallback((field: keyof IMEIRecord, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  if (!record) return null;

  return (
    <>
    </>
    // <Modal isOpen={isOpen} onOpenChange={onClose}>
    //   <ModalContent className="max-w-2xl">
    //     <div className="flex items-center justify-between p-6 border-b border-secondary">
    //       <div>
    //         <h2 className="text-lg font-semibold text-primary">Editar Dispositivo</h2>
    //         <p className="text-sm text-secondary mt-1">
    //           IMEI: <span className="font-mono">{record.imei}</span>
    //         </p>
    //       </div>
    //       <ButtonUtility 
    //         size="sm" 
    //         color="tertiary" 
    //         icon={X} 
    //         onClick={onClose}
    //         aria-label="Cerrar modal"
    //       />
    //     </div>

    //     <div className="p-6 space-y-6">
    //       {/* Device Info (Read-only) */}
    //       <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
    //         <div>
    //           <Label className="text-xs font-medium text-secondary">Usuario</Label>
    //           <p className="text-sm font-medium">{record.nombre_soti || "-"}</p>
    //         </div>
    //         <div>
    //           <Label className="text-xs font-medium text-secondary">Modelo</Label>
    //           <p className="text-sm">{record.modelo || "-"}</p>
    //         </div>
    //         <div>
    //           <Label className="text-xs font-medium text-secondary">Distribuidora</Label>
    //           <p className="text-sm">{record.distribuidora_soti || "-"}</p>
    //         </div>
    //         <div>
    //           <Label className="text-xs font-medium text-secondary">Última Conexión</Label>
    //           <p className="text-sm">
    //             {record.ultima_conexion 
    //               ? new Date(record.ultima_conexion).toLocaleDateString('es-ES')
    //               : "-"
    //             }
    //           </p>
    //         </div>
    //       </div>

    //       {/* Editable Fields */}
    //       <div className="space-y-4">
    //         <div>
    //           <Label htmlFor="status">Estado de Asignación</Label>
    //           {/* <Select
    //             value={formData.status_asignación || ""}
    //             onValueChange={(value) => handleFieldChange("status_asignación", value)}
    //           >
    //             <SelectTrigger>
    //               <SelectValue placeholder="Seleccionar estado..." />
    //             </SelectTrigger>
    //             <SelectContent>
    //               {statusOptions.map((option) => (
    //                 <SelectItem key={option.value} value={option.value}>
    //                   {option.label}
    //                 </SelectItem>
    //               ))}
    //             </SelectContent>
    //           </Select> */}
    //         </div>

    //         <div className="grid grid-cols-2 gap-4">
    //           <div>
    //             <Label htmlFor="ticket">Ticket</Label>
    //             <Input
    //               id="ticket"
    //               value={formData.ticket || ""}
    //               onChange={(e:any) => handleFieldChange("ticket", e.target.value)}
    //               placeholder="Número de ticket"
    //             />
    //           </div>
    //           <div>
    //             <Label htmlFor="linea">Línea</Label>
    //             <Input
    //               id="linea"
    //               value={formData.linea_e_tarifacion || ""}
    //               onChange={(e:any) => handleFieldChange("linea_e_tarifacion", e.target.value)}
    //               placeholder="Número de línea"
    //             />
    //           </div>
    //         </div>

    //         <div>
    //           <Label htmlFor="plan">Plan/Abono</Label>
    //           <Input
    //             id="plan"
    //             value={formData.plan_e_tarifación || ""}
    //             onChange={(e:any) => handleFieldChange("plan_e_tarifación", e.target.value)}
    //             placeholder="Plan de tarifación"
    //           />
    //         </div>

    //         <div>
    //           <Label htmlFor="observaciones">Observaciones</Label>
    //           <TextArea
    //             id="observaciones"
    //             value={formData.observaciones || ""}
    //             onChange={(e:any) => handleFieldChange("observaciones", e.target.value)}
    //             placeholder="Notas adicionales..."
    //             rows={3}
    //           />
    //         </div>
    //       </div>
    //     </div>

    //     <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary">
    //       <Button 
    //         color="secondary" 
    //         onClick={onClose}
    //         disabled={isSaving}
    //       >
    //         Cancelar
    //       </Button>
    //       <Button 
    //         onClick={handleSave}
    //         disabled={isSaving || isLoading}
    //         className={cx(
    //           isSaving && "opacity-50 cursor-not-allowed"
    //         )}
    //       >
    //         {isSaving ? "Guardando..." : "Guardar Cambios"}
    //       </Button>
    //     </div>
    //   </ModalContent>
    // </Modal>
  );
});

EditRecordModal.displayName = 'EditRecordModal';