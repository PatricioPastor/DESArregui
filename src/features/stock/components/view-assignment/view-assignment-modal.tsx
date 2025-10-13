"use client";

import { useEffect, useState } from "react";

import { Dialog } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { X, Download01, File01, User01, Phone01, MarkerPin01, Calendar, Package, Phone } from "@untitledui/icons";
import { toast } from "sonner";
import { generateShippingVoucherPDF } from "@/utils/pdf-generator";
import { Modal, ModalOverlay } from "@/components/application/modals/modal";

interface Assignment {
  id: string;
  assignee_name: string;
  assignee_phone: string;
  delivery_location: string;
  contact_details?: string;
  shipping_voucher_id?: string;
  expects_return: boolean;
  return_device_imei?: string;
  status: string;
  at: string;
  distributor?: {
    id: string;
    name: string;
  };
  soti_device?: {
    id: string;
    device_name: string;
    model: string;
  };
}

interface ViewAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  deviceInfo?: any;
}

export function ViewAssignmentModal({
  open,
  onOpenChange,
  deviceId,
  deviceInfo
}: ViewAssignmentModalProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch assignment details when modal opens
  useEffect(() => {
    if (open && deviceId) {
      fetchAssignmentDetails();
    }
  }, [open, deviceId]);

  const fetchAssignmentDetails = async () => {
    if (!deviceId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments?soti_device_id=${deviceId}&status=active`);
      if (!response.ok) throw new Error('Error al cargar detalles de asignación');
      
      const data = await response.json();
      if (data.assignments && data.assignments.length > 0) {
        setAssignment(data.assignments[0]);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      toast.error('Error al cargar los detalles de la asignación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!assignment || !deviceInfo) return;

    setIsGeneratingPDF(true);
    try {
      await generateShippingVoucherPDF({
        voucherId: assignment.shipping_voucher_id || 'SIN-VALE',
        assigneeName: assignment.assignee_name,
        assigneePhone: assignment.assignee_phone,
        deliveryLocation: assignment.delivery_location,
        contactDetails: assignment.contact_details || '',
        deviceName: assignment.soti_device?.device_name || deviceInfo.device_name,
        deviceModel: assignment.soti_device?.model || deviceInfo.model,
        deviceImei: deviceInfo.imei,
        distributorName: assignment.distributor?.name || 'No especificada',
        expectsReturn: assignment.expects_return,
        returnDeviceImei: assignment.return_device_imei || '',
        assignmentDate: assignment.at
      });
      
      toast.success('Vale de envío descargado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el vale de envío');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setAssignment(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'success' as const, label: 'Activa' },
      completed: { color: 'gray' as const, label: 'Completada' },
      cancelled: { color: 'error' as const, label: 'Cancelada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <BadgeWithDot color={config.color} size="sm">{config.label}</BadgeWithDot>;
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-2xl w-full flex flex-col mx-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary">
            <div>
              <h2 className="text-lg font-semibold text-primary">Detalles de Asignación</h2>
              <p className="text-sm text-secondary mt-1">
                {deviceInfo?.device_name || 'Dispositivo'} - {deviceInfo?.model}
              </p>
            </div>
            <ButtonUtility
              onClick={handleClose}
              className="p-2 text-secondary hover:text-primary"
              icon={X}
              size="sm"
            />
          </div>

          {/* Content */}
          <div className="px-6 py-6 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Cargando detalles...</span>
              </div>
            ) : assignment ? (
              <div className="space-y-6">
                {/* Estado y Vale */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-secondary">Estado:</span>
                    {getStatusBadge(assignment.status)}
                  </div>
                  {assignment.shipping_voucher_id && (
                    <BadgeWithDot color="blue-light" size="lg">
                      Vale: {assignment.shipping_voucher_id}
                    </BadgeWithDot>
                  )}
                </div>

                {/* Información del Asignatario */}
                <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                    <User01 className="w-4 h-4" />
                    Información del Asignatario
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-secondary">Nombre:</span>
                      <p className="text-primary font-medium">{assignment.assignee_name}</p>
                    </div>
                    <div>
                      <span className="text-secondary">Teléfono:</span>
                      <p className="text-primary font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {assignment.assignee_phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información de Entrega */}
                <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Información de Entrega
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-secondary">Ubicación de entrega:</span>
                      <p className="text-primary font-medium flex items-start gap-1">
                        <MarkerPin01 className="w-3 h-3 mt-0.5" />
                        {assignment.delivery_location}
                      </p>
                    </div>
                    {assignment.distributor && (
                      <div>
                        <span className="text-secondary">Distribuidora:</span>
                        <p className="text-primary font-medium">{assignment.distributor.name}</p>
                      </div>
                    )}
                    {assignment.contact_details && (
                      <div>
                        <span className="text-secondary">Contacto adicional:</span>
                        <p className="text-primary">{assignment.contact_details}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información del Dispositivo */}
                <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                    <File01 className="w-4 h-4" />
                    Información del Dispositivo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-secondary">Nombre del dispositivo:</span>
                      <p className="text-primary font-medium">
                        {assignment.soti_device?.device_name || deviceInfo?.device_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-secondary">Modelo:</span>
                      <p className="text-primary font-medium">
                        {assignment.soti_device?.model || deviceInfo?.model}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-secondary">IMEI:</span>
                      <p className="text-primary font-mono text-xs">{deviceInfo?.imei}</p>
                    </div>
                  </div>
                </div>

                {/* Información de Devolución */}
                {assignment.expects_return && (
                  <div className="rounded-lg bg-purple-900/20 border border-purple-700/50 p-4">
                    <h3 className="text-sm font-semibold text-purple-200 mb-3">
                      Devolución Esperada
                    </h3>
                    <div className="text-sm">
                      <span className="text-purple-300">IMEI del dispositivo a devolver:</span>
                      <p className="text-purple-100 font-mono text-xs">
                        {assignment.return_device_imei || 'No especificado'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Fecha de Asignación */}
                <div className="text-center text-sm text-secondary">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Asignado el {formatDate(assignment.at)}
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-secondary">No se encontraron detalles de asignación</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-surface">
            <Button 
              color="secondary" 
              onClick={handleClose}
            >
              Cerrar
            </Button>
            
            {assignment?.shipping_voucher_id && (
              <Button
                color="primary"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                iconLeading={Download01}
              >
                {isGeneratingPDF ? 'Generando...' : 'Descargar Vale PDF'}
              </Button>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
