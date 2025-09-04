"use client";

import { useState } from "react";
import { X } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Modal } from "../application/modals/modal";



interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stockData: {
    imei: string;
    modelo: string;
    distribuidora: string;
  }) => Promise<boolean>;
  isLoading?: boolean;
}

const MODELO_OPTIONS = [
  { value: "iPhone 12", label: "iPhone 12" },
  { value: "iPhone 13", label: "iPhone 13" },
  { value: "iPhone 14", label: "iPhone 14" },
  { value: "iPhone 15", label: "iPhone 15" },
  { value: "Samsung Galaxy S23", label: "Samsung Galaxy S23" },
  { value: "Samsung Galaxy S24", label: "Samsung Galaxy S24" },
  { value: "Google Pixel 7", label: "Google Pixel 7" },
  { value: "Google Pixel 8", label: "Google Pixel 8" },
];

const DISTRIBUIDORA_OPTIONS = [
  { value: "EDEA", label: "EDEA" },
  { value: "EDEN", label: "EDEN" },
  { value: "EDES", label: "EDES" },
  { value: "CENTRAL", label: "CENTRAL" },
];

export function AddStockModal({ isOpen, onClose, onSave, isLoading = false }: AddStockModalProps) {
  const [formData, setFormData] = useState({
    imei: "",
    modelo: "",
    distribuidora: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!formData.imei.trim()) {
      newErrors.imei = "IMEI es requerido";
    } else if (formData.imei.length < 15) {
      newErrors.imei = "IMEI debe tener al menos 15 dígitos";
    }
    
    if (!formData.modelo) {
      newErrors.modelo = "Modelo es requerido";
    }
    
    if (!formData.distribuidora) {
      newErrors.distribuidora = "Distribuidora es requerida";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Save stock
    const success = await onSave(formData);
    
    if (success) {
      // Reset form and close modal
      setFormData({
        imei: "",
        modelo: "",
        distribuidora: "",
      });
      setErrors({});
      onClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        imei: "",
        modelo: "",
        distribuidora: "",
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen}>
      {/* <Modal.Content className="max-w-md">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Agregar Dispositivo al Stock</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="p-1"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              IMEI <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.imei}
              onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
              placeholder="Ingresa el IMEI del dispositivo"
              disabled={isLoading}
              error={!!errors.imei}
              helperText={errors.imei}
              maxLength={20}
            />
            <p className="text-xs text-secondary mt-1">
              Ingresa el IMEI de 15 dígitos del dispositivo
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Modelo <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.modelo}
              onChange={(value) => setFormData(prev => ({ ...prev, modelo: value }))}
              placeholder="Selecciona el modelo"
              disabled={isLoading}
              options={MODELO_OPTIONS}
              error={!!errors.modelo}
              helperText={errors.modelo}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Distribuidora <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.distribuidora}
              onChange={(value) => setFormData(prev => ({ ...prev, distribuidora: value }))}
              placeholder="Selecciona la distribuidora"
              disabled={isLoading}
              options={DISTRIBUIDORA_OPTIONS}
              error={!!errors.distribuidora}
              helperText={errors.distribuidora}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Guardando..." : "Agregar al Stock"}
            </Button>
          </div>
        </form>
      </Modal.Content> */}
    </Modal>
  );
}