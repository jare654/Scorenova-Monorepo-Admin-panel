import { apiClient } from "./client";

export interface Permission {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
}

export interface Role {
  id: string;
  name: string;
  key?: string;
  description?: string;
  rolePermissions?: Array<{
    id: string;
    permissionId: string;
    permission?: Permission;
  }>;
  createdAt?: string;
}

function normalizeArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as T[];
    if (Array.isArray(p.items)) return p.items as T[];
  }
  return [];
}

export async function fetchRoles(signal?: AbortSignal): Promise<Role[]> {
  const res = await apiClient.get<unknown>("/roles/get-roles", signal);
  return normalizeArray<Role>(res);
}

export async function createRole(data: { name: string; description?: string }): Promise<Role> {
  return apiClient.post<Role>("/roles/create-role", data);
}

export async function updateRole(data: { id: string; name: string; description?: string }): Promise<Role> {
  return apiClient.post<Role>("/roles/update-role", data);
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/delete-role/${id}`);
}

export async function fetchPermissions(signal?: AbortSignal): Promise<Permission[]> {
  const res = await apiClient.get<unknown>("/permissions/get-permissions", signal);
  return normalizeArray<Permission>(res);
}

export async function createPermission(data: { name: string; code?: string; description?: string }): Promise<Permission> {
  return apiClient.post<Permission>("/permissions/create-permission", data);
}

export async function updatePermission(data: { id: string; name: string; description?: string }): Promise<Permission> {
  return apiClient.post<Permission>("/permissions/update-permission", data);
}

export async function assignRolePermissions(roleId: string, permissions: string[]): Promise<any> {
  return apiClient.post("/roles/create-role-permissions", { roleId, permissions });
}
