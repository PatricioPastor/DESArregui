"use client";

import { useState } from "react";
import { CheckCircle, Trash01, UserPlus01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { CloseAssignmentModal } from "@/features/stock/components/close-assignment";
import { DeleteDeviceModal } from "@/features/stock/components/delete";

interface HeaderActionsProps {
    canManuallyAssign: boolean;
    canDelete: boolean;
    hasActiveAssignment: boolean;
    assignmentId?: string;
    assignmentAssigneeName?: string;
    assignmentAt?: string;
    deviceImei: string;
    deviceInfo: {
        id: string;
        imei: string;
        modelo: string;
        status: string;
    };
    onSuccess?: () => void;
}

export function HeaderActions({
    canManuallyAssign,
    canDelete,
    hasActiveAssignment,
    assignmentId,
    assignmentAssigneeName,
    assignmentAt,
    deviceImei,
    deviceInfo,
    onSuccess,
}: HeaderActionsProps) {
    const router = useRouter();
    const [isCloseAssignmentModalOpen, setIsCloseAssignmentModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleCloseAssignmentSuccess = () => {
        setIsCloseAssignmentModalOpen(false);
        router.refresh();
        onSuccess?.();
    };

    const handleDeleteSuccess = () => {
        router.push("/stock");
    };

    if (!canManuallyAssign && !canDelete && !hasActiveAssignment) {
        return null;
    }

    return (
        <>
            <div className="flex shrink-0 justify-end gap-3">
                {hasActiveAssignment && assignmentId && (
                    <Button color="secondary" size="md" iconLeading={CheckCircle} onClick={() => setIsCloseAssignmentModalOpen(true)}>
                        Finalizar Asignación
                    </Button>
                )}
                {canManuallyAssign && (
                    <Button color="primary" size="md" iconLeading={UserPlus01} href={`/stock/assign?imei=${deviceImei}`}>
                        Asignar Manualmente
                    </Button>
                )}
                {canDelete && (
                    <Button color="primary-destructive" size="md" iconLeading={Trash01} onClick={() => setIsDeleteModalOpen(true)}>
                        Eliminar Dispositivo
                    </Button>
                )}
            </div>

            {/* Modal de cierre de asignación */}
            {hasActiveAssignment && assignmentId && assignmentAssigneeName && assignmentAt && (
                <CloseAssignmentModal
                    open={isCloseAssignmentModalOpen}
                    onOpenChange={setIsCloseAssignmentModalOpen}
                    assignmentInfo={{
                        id: assignmentId,
                        assignee_name: assignmentAssigneeName,
                        at: assignmentAt,
                    }}
                    onSuccess={handleCloseAssignmentSuccess}
                />
            )}

            {/* Modal de eliminación */}
            <DeleteDeviceModal open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} deviceInfo={deviceInfo} onSuccess={handleDeleteSuccess} />
        </>
    );
}
