"use client";

import { useState } from 'react';
import { FeaturedIcon } from "../foundations/featured-icon/featured-icons";
import { HelpOctagon1, X } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from '../application/modals/modal';
import { ButtonUtility } from '../base/buttons/button-utility';

interface KpiCardWithModalProps {
  label: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  modalContent: {
    title: string;
    description: string;
    details: Array<{
      label: string;
      value: string | number;
      description?: string;
    }>;
    insights?: string[];
  };
}

export function KpiCardWithModal({
  label,
  value,
  icon,
  subtitle,
  modalContent
}: KpiCardWithModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-lg border  border-surface bg-surface-1 p-4 hover:shadow-md transition-shadow"
        
      >
        <div className="flex gap-2 items-start justify-between">
          <div className="flex gap-2 items-start">
            <FeaturedIcon
              size="md"
              color="brand"
              className="text-gray-500"
              theme="modern-neue"
              icon={icon}
            />
            <h3 className="font-medium">{label}</h3>
          </div>
          <ButtonUtility color='secondary' size='xs' icon={HelpOctagon1} onClick={() => setIsModalOpen(true)} >
            
          </ButtonUtility>
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <ModalOverlay isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <Modal>
          <Dialog className="bg-primary rounded-lg shadow-xl max-w-3xl w-full mx-auto">
            <div className="p-6 w-full">
              {/* Header */}
              <div className="flex items-start w-full justify-between mb-4">
                <div className="flex gap-3 items-center">
                  <FeaturedIcon
                    size="lg"
                    color="brand"
                    theme="modern-neue"
                    icon={icon}
                  />
                  <div>
                    <h2 className="text-xl font-semibold">{modalContent.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {modalContent.description}
                    </p>
                  </div>
                </div>
                <ButtonUtility
                  color="secondary"
                  size="xs"
                  onClick={() => setIsModalOpen(false)}
                  icon={X}
                />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {modalContent.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-surface bg-background"
                  >
                    <p className="text-sm text-muted-foreground mb-1">
                      {detail.label}
                    </p>
                    <p className="text-2xl font-bold mb-1">{detail.value}</p>
                    {detail.description && (
                      <p className="text-xs text-muted-foreground">
                        {detail.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Insights */}
              {modalContent.insights && modalContent.insights.length > 0 && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
                    💡 Insights
                  </h3>
                  <ul className="space-y-1">
                    {modalContent.insights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
