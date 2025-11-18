"use client";

import { ReactNode } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { X } from "@untitledui/icons";
import { cx } from "@/utils/cx";

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  className,
}: BaseModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog
          className={cx(
            "bg-primary rounded-lg shadow-xl w-full flex flex-col mx-auto",
            sizeClasses[size],
            // Altura máxima sin scroll - calculada dinámicamente
            "max-h-[calc(100vh-4rem)]",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center w-full justify-between px-6 py-4 border-b border-secondary shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-primary">{title}</h2>
              {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
            </div>
            <ButtonUtility
              onClick={handleClose}
              className="p-2 text-secondary hover:text-primary shrink-0"
              icon={X}
              size="xs"
            />
          </div>

          {/* Content - Sin scroll, con overflow inteligente */}
          <div className="px-6 py-4 flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto">{children}</div>
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface w-full shrink-0">
              {footer}
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

