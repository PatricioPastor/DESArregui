"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit01, RefreshCw01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableCard } from "@/components/application/table/table";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { BaseModal } from "@/components/modals/base-modal";
import { admin, useSession } from "@/lib/auth-client";

type IAMUserRow = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
    isActive?: boolean | null;
    banned?: boolean | null;
    createdAt: string;
};

type AuthRole = {
    id: string;
    name: string;
    label: string;
    description?: string | null;
};

function getInitials(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "?";

    const parts = trimmed.split(/\s+/g).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function extractUsersFromAdminListUsersResponse(response: unknown): IAMUserRow[] {
    const root = response as any;

    // Better Auth usually returns: { data: { users: [...] } }
    // In this codebase we also observed: { data: { data: { users: [...] } } }
    const candidates = [root?.data, root?.data?.users, root?.data?.data, root?.data?.data?.users, root?.data?.data?.data, root?.data?.data?.data?.users];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate as IAMUserRow[];
        }

        if (candidate && Array.isArray((candidate as any).users)) {
            return (candidate as any).users as IAMUserRow[];
        }
    }

    return [];
}

export default function IAMUsersPage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    const [users, setUsers] = useState<IAMUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
    const [rolesModalUser, setRolesModalUser] = useState<IAMUserRow | null>(null);

    const [availableRoles, setAvailableRoles] = useState<AuthRole[]>([]);
    const [assignedRoleNames, setAssignedRoleNames] = useState<Set<string>>(new Set());
    const [rolesLoading, setRolesLoading] = useState(false);
    const [rolesSaving, setRolesSaving] = useState(false);

    const isAdminUser = useMemo(() => session?.user?.role === "admin", [session?.user?.role]);

    useEffect(() => {
        if (isPending) return;

        if (!session?.user?.email) {
            router.replace("/login");
            return;
        }

        if (!isAdminUser) {
            router.replace("/");
        }
    }, [isAdminUser, isPending, router, session?.user?.email]);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setError(null);
                setLoading(true);

                const response = await admin.listUsers({
                    query: {
                        limit: 100,
                        sortBy: "createdAt",
                        sortDirection: "desc",
                    },
                });

                setUsers(extractUsersFromAdminListUsersResponse(response));
            } catch (caughtError) {
                console.error("Error loading IAM users:", caughtError);
                setError("No se pudieron cargar los usuarios.");
            } finally {
                setLoading(false);
            }
        };

        void loadUsers();
    }, []);

    const openRolesModal = (user: IAMUserRow) => {
        setRolesModalUser(user);
        setIsRolesModalOpen(true);
    };

    useEffect(() => {
        const loadRoles = async (userId: string) => {
            try {
                setRolesLoading(true);

                const [rolesResponse, userRolesResponse] = await Promise.all([fetch("/api/iam/roles"), fetch(`/api/iam/users/${userId}/roles`)]);

                if (!rolesResponse.ok) {
                    throw new Error("rolesResponse not ok");
                }
                if (!userRolesResponse.ok) {
                    throw new Error("userRolesResponse not ok");
                }

                const rolesJson = (await rolesResponse.json()) as { data?: AuthRole[] };
                const userRolesJson = (await userRolesResponse.json()) as { data?: { roleNames?: string[] } };

                const roles = rolesJson.data ?? [];
                const roleNames = userRolesJson.data?.roleNames ?? [];

                setAvailableRoles(roles);
                setAssignedRoleNames(new Set(roleNames));
            } catch (caughtError) {
                console.error("Error loading roles:", caughtError);
                toast.error("No se pudieron cargar los roles");
                setAvailableRoles([]);
                setAssignedRoleNames(new Set());
            } finally {
                setRolesLoading(false);
            }
        };

        if (!isRolesModalOpen || !rolesModalUser?.id) return;

        void loadRoles(rolesModalUser.id);
    }, [isRolesModalOpen, rolesModalUser?.id]);

    const toggleRole = (roleName: string, selected: boolean) => {
        setAssignedRoleNames((prev) => {
            const next = new Set(prev);
            if (selected) {
                next.add(roleName);
            } else {
                next.delete(roleName);
            }
            return next;
        });
    };

    const saveRoles = async () => {
        if (!rolesModalUser?.id) return;

        try {
            setRolesSaving(true);

            const roleNames = Array.from(assignedRoleNames);

            const response = await fetch(`/api/iam/users/${rolesModalUser.id}/roles`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ roleNames }),
            });

            if (!response.ok) {
                throw new Error("Failed to update roles");
            }

            toast.success("Roles actualizados");
            setIsRolesModalOpen(false);
        } catch (caughtError) {
            console.error("Error saving roles:", caughtError);
            toast.error("No se pudieron guardar los roles");
        } finally {
            setRolesSaving(false);
        }
    };

    if (isPending || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex items-center gap-2 text-tertiary">
                    <RefreshCw01 className="h-5 w-5 animate-spin" />
                    <span>Cargando usuarios...</span>
                </div>
            </div>
        );
    }

    if (!session?.user?.email || !isAdminUser) {
        return null;
    }

    return (
        <>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-primary">IAM · Usuarios</h1>
                    <p className="mt-1 text-sm text-secondary">Gestión de usuarios (solo admin).</p>
                </div>

                {error && <div className="border-danger bg-danger/10 text-danger rounded-md border px-4 py-3 text-sm">{error}</div>}

                <TableCard.Root>
                    <TableCard.Header
                        title="Usuarios"
                        badge={users.length.toLocaleString("es-AR")}
                        description="Listado de usuarios registrados en el sistema."
                    />

                    <Table aria-label="Tabla de usuarios" selectionMode="none">
                        <Table.Header>
                            <Table.Head id="user" label="Usuario" isRowHeader className="w-auto" />
                            <Table.Head id="role" label="Rol" className="w-28" />
                            <Table.Head id="isActive" label="Activo" className="w-28" />
                            <Table.Head id="createdAt" label="Creado" className="w-36" />
                            <Table.Head id="actions" label="" className="w-12" />
                        </Table.Header>

                        <Table.Body items={users}>
                            {(user: IAMUserRow) => (
                                <Table.Row id={user.id}>
                                    <Table.Cell>
                                        <AvatarLabelGroup
                                            size="sm"
                                            src={user.image ?? undefined}
                                            alt={user.name || user.email}
                                            initials={getInitials(user.name || user.email)}
                                            title={user.name || "Sin nombre"}
                                            subtitle={user.email}
                                        />
                                    </Table.Cell>

                                    <Table.Cell>
                                        {user.role ? (
                                            <Badge color="gray" size="sm">
                                                {String(user.role)}
                                            </Badge>
                                        ) : (
                                            <span className="text-quaternary">-</span>
                                        )}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <BadgeWithDot type="modern" color={user.isActive ? "success" : "gray"} size="sm">
                                            {user.isActive ? "Activo" : "Inactivo"}
                                        </BadgeWithDot>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <span className="text-sm">
                                            {new Date(user.createdAt).toLocaleDateString("es-AR", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div className="flex justify-end">
                                            <Dropdown.Root>
                                                <Dropdown.DotsButton />
                                                <Dropdown.Popover className="w-56">
                                                    <Dropdown.Menu
                                                        onAction={(key) => {
                                                            if (key === "edit-roles") {
                                                                openRolesModal(user);
                                                            }
                                                        }}
                                                    >
                                                        <Dropdown.Item id="edit-roles" icon={Edit01}>
                                                            Editar roles
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown.Popover>
                                            </Dropdown.Root>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>

                    {users.length === 0 && !error && <div className="px-6 py-8 text-sm text-tertiary">No hay usuarios para mostrar.</div>}
                </TableCard.Root>
            </div>

            <BaseModal
                open={isRolesModalOpen}
                onOpenChange={(open) => {
                    setIsRolesModalOpen(open);
                    if (!open) {
                        setRolesModalUser(null);
                        setAvailableRoles([]);
                        setAssignedRoleNames(new Set());
                    }
                }}
                title="Editar roles"
                subtitle={rolesModalUser ? `${rolesModalUser.name || "Sin nombre"} · ${rolesModalUser.email}` : undefined}
                size="md"
                footer={
                    <>
                        <Button color="secondary" size="md" onClick={() => setIsRolesModalOpen(false)} isDisabled={rolesSaving}>
                            Cancelar
                        </Button>
                        <Button color="primary" size="md" onClick={saveRoles} isDisabled={rolesSaving || rolesLoading}>
                            {rolesSaving ? "Guardando..." : "Guardar"}
                        </Button>
                    </>
                }
            >
                {rolesLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <div className="flex items-center gap-2 text-tertiary">
                            <RefreshCw01 className="h-5 w-5 animate-spin" />
                            <span>Cargando roles...</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-tertiary">
                            Estos roles controlan la visualización de páginas (por ejemplo, reportes o SIMS). No modifican el rol principal de Better Auth.
                        </p>

                        <div className="flex flex-col gap-3 rounded-lg border border-secondary bg-surface-1 p-4">
                            {availableRoles.length === 0 ? (
                                <p className="text-sm text-tertiary">No hay roles disponibles.</p>
                            ) : (
                                availableRoles.map((role) => (
                                    <Checkbox
                                        key={role.id}
                                        isSelected={assignedRoleNames.has(role.name)}
                                        onChange={(selected) => toggleRole(role.name, selected)}
                                        label={role.label || role.name}
                                        hint={role.description ? `${role.name} · ${role.description}` : role.name}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </BaseModal>
        </>
    );
}
