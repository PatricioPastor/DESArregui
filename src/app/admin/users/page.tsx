"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { admin, useSession } from "@/lib/auth-client";
import { isAdmin } from "@/utils/user-roles";
import { Button } from "@/components/base/buttons/button";

import { CheckCircle, XCircle, RefreshCw01 } from "@untitledui/icons";
import { BadgeWithDot } from "@/components/base/badges/badges";


interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isActive?: boolean;
  role?: string;
  createdAt: string;
  image?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!isPending && session) {
      if (!isAdmin(session.user.email)) {
        router.push("/");
      }
    }
  }, [session, isPending, router]);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await admin.listUsers({
        query: {
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (response.data) {
        setUsers(response.data as unknown as User[]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdating(userId);

      await admin.updateUser({
        userId,
        data: {
          isActive: !currentStatus,
        },
      });

      // Reload users to get updated status
      await loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error al actualizar el usuario");
    } finally {
      setUpdating(null);
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      setUpdating(userId);

      await admin.updateUser({
        userId,
        data: {
          role: newRole,
        },
      });

      // Reload users to get updated status
      await loadUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Error al actualizar el rol del usuario");
    } finally {
      setUpdating(null);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw01 className="h-5 w-5 animate-spin" />
          <span>Cargando usuarios...</span>
        </div>
      </div>
    );
  }

  if (!session || !isAdmin(session.user.email)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Gestión de Usuarios
        </h1>
        <p className="text-gray-400">
          Administrá los usuarios del sistema y sus permisos de acceso
        </p>
      </div>

      <div className="bg-surface-3 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email Verificado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Fecha de Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.image ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={user.image}
                            alt={user.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-brand-solid flex items-center justify-center">
                            <span className="text-white font-medium">
                              {user.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {user.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{user.email}</div>
                    {isAdmin(user.email) && (
                      <BadgeWithDot type="modern" color="success" size="sm" className="mt-1">
                        Admin
                      </BadgeWithDot>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role || 'viewer'}
                      onChange={(e) => changeUserRole(user.id, e.target.value)}
                      disabled={updating === user.id}
                      className="text-sm bg-surface-2 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-brand-solid disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="sims-viewer">SIMS Viewer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <BadgeWithDot type="modern" color="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activo
                      </BadgeWithDot>
                    ) : (
                      <BadgeWithDot type="modern" color="success">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactivo
                      </BadgeWithDot>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.emailVerified ? (
                      <BadgeWithDot type="modern" color="success">Verificado</BadgeWithDot>
                    ) : (
                      <BadgeWithDot type="modern" color="success">No verificado</BadgeWithDot>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("es-AR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      color={user.isActive ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => toggleUserActive(user.id, user.isActive ?? false)}
                      disabled={updating === user.id}
                    >
                      {updating === user.id ? (
                        <>
                          <RefreshCw01 className="h-4 w-4 mr-1 animate-spin" />
                          Actualizando...
                        </>
                      ) : user.isActive ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              No se encontraron usuarios
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Total de usuarios: <span className="font-semibold text-white">{users.length}</span>
        </p>
        <Button color="secondary" size="sm" onClick={loadUsers}>
          <RefreshCw01 className="h-4 w-4 mr-2" />
          Refrescar
        </Button>
      </div>
    </div>
  );
}
