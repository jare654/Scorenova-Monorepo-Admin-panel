import { useState } from "react";
import {
  Shield,
  Key,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  Loader2,
  Lock,
  Users,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissions,
  createPermission,
  assignRolePermissions,
  type Role,
  type Permission,
} from "@/services/api/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function RolesPermissionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [search, setSearch] = useState("");

  // Role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");

  // Role Permissions modal state
  const [permsDialogOpen, setPermsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);

  // Permission create dialog state
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permName, setPermName] = useState("");
  const [permCode, setPermCode] = useState("");
  const [permDesc, setPermDesc] = useState("");

  // Delete target
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);

  // ── Queries
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["roles-list"],
    queryFn: ({ signal }) => fetchRoles(signal),
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery<Permission[]>({
    queryKey: ["permissions-list"],
    queryFn: ({ signal }) => fetchPermissions(signal),
  });

  // ── Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-list"] });
      toast({ title: "Role Created", description: `Role ${roleName} has been created.` });
      setRoleDialogOpen(false);
      resetRoleForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create role.", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description?: string }) => updateRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-list"] });
      toast({ title: "Role Updated", description: "Role changes saved." });
      setRoleDialogOpen(false);
      resetRoleForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update role.", variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-list"] });
      toast({ title: "Role Deleted", description: "Role has been removed." });
      setDeleteRoleTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete role.", variant: "destructive" });
    },
  });

  const assignPermsMutation = useMutation({
    mutationFn: ({ roleId, perms }: { roleId: string; perms: string[] }) =>
      assignRolePermissions(roleId, perms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-list"] });
      toast({ title: "Permissions Saved", description: "Role permissions updated." });
      setPermsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update permissions.", variant: "destructive" });
    },
  });

  const createPermMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string }) => createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions-list"] });
      toast({ title: "Permission Created", description: `Permission ${permName} created.` });
      setPermDialogOpen(false);
      resetPermForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create permission.", variant: "destructive" });
    },
  });

  const resetRoleForm = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
  };

  const resetPermForm = () => {
    setPermName("");
    setPermCode("");
    setPermDesc("");
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || "");
    setRoleDialogOpen(true);
  };

  const openAssignPerms = (role: Role) => {
    setSelectedRole(role);
    const existing = (role.rolePermissions || []).map((rp) => rp.permissionId || rp.permission?.id || "").filter(Boolean);
    setSelectedPermIds(existing);
    setPermsDialogOpen(true);
  };

  const handleTogglePerm = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPerms = permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Configure access control, administrator privileges, and feature-level security policies.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "roles" ? (
            <Button
              onClick={() => {
                resetRoleForm();
                setRoleDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Role
            </Button>
          ) : (
            <Button
              onClick={() => {
                resetPermForm();
                setPermDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Permission
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b">
          <TabsList>
            <TabsTrigger value="roles" className="gap-1.5">
              <Shield className="h-4 w-4" /> Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5">
              <Key className="h-4 w-4" /> System Permissions ({permissions.length})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          {rolesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-card">
              <Shield className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No roles found.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Permissions</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => {
                    const count = role.rolePermissions?.length ?? 0;
                    return (
                      <tr key={role.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                              <Shield className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">{role.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-sm">
                          {role.description || "—"}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => openAssignPerms(role)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Lock className="h-3 w-3" />
                            {count} {count === 1 ? "Permission" : "Permissions"}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => openAssignPerms(role)}
                            >
                              Configure
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditRole(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteRoleTarget(role)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-4">
          {permsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPerms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-card">
              <Key className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No permissions found.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium text-muted-foreground">Permission Name</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Code / Identifier</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPerms.map((perm) => (
                    <tr key={perm.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">{perm.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {perm.code || perm.name.toLowerCase().replace(/\s+/g, "-")}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {perm.description || "System permission"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Role Dialog */}
      <Dialog
        open={roleDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setRoleDialogOpen(false);
            resetRoleForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            <DialogDescription>
              Define the role identity and optional operational description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Role Name *</Label>
              <Input
                id="r-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Content Reviewer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Description</Label>
              <Textarea
                id="r-desc"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                rows={3}
                placeholder="What responsibilities does this role have?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRoleDialogOpen(false);
                resetRoleForm();
              }}
              disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRole) {
                  updateRoleMutation.mutate({ id: editingRole.id, name: roleName.trim(), description: roleDesc.trim() });
                } else {
                  createRoleMutation.mutate({ name: roleName.trim(), description: roleDesc.trim() });
                }
              }}
              disabled={!roleName.trim() || createRoleMutation.isPending || updateRoleMutation.isPending}
            >
              {createRoleMutation.isPending || updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…
                </>
              ) : (
                "Save Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Permissions Modal */}
      <Dialog open={permsDialogOpen} onOpenChange={(v) => !v && setPermsDialogOpen(false)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Configure Permissions for {selectedRole?.name}
            </DialogTitle>
            <DialogDescription>
              Check the permissions granted to administrators with this role.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
            {permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No permissions available.</p>
            ) : (
              permissions.map((perm) => {
                const checked = selectedPermIds.includes(perm.id);
                return (
                  <div
                    key={perm.id}
                    onClick={() => handleTogglePerm(perm.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "bg-primary/5 border-primary/40"
                        : "bg-card hover:bg-muted/40 border-border"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                        checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {checked && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{perm.name}</span>
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {perm.code || perm.name.toLowerCase().replace(/\s+/g, "-")}
                        </code>
                      </div>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setPermsDialogOpen(false)} disabled={assignPermsMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedRole) return;
                assignPermsMutation.mutate({ roleId: selectedRole.id, perms: selectedPermIds });
              }}
              disabled={assignPermsMutation.isPending}
            >
              {assignPermsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…
                </>
              ) : (
                `Save Permissions (${selectedPermIds.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Permission Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={(v) => !v && setPermDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create System Permission</DialogTitle>
            <DialogDescription>
              Register a new operational capability for roles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Permission Name *</Label>
              <Input
                id="p-name"
                value={permName}
                onChange={(e) => setPermName(e.target.value)}
                placeholder="e.g. Manage Questions"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-code">Permission Code</Label>
              <Input
                id="p-code"
                value={permCode}
                onChange={(e) => setPermCode(e.target.value)}
                placeholder="e.g. manage-questions"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={permDesc}
                onChange={(e) => setPermDesc(e.target.value)}
                rows={2}
                placeholder="What action does this permission authorize?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)} disabled={createPermMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createPermMutation.mutate({
                  name: permName.trim(),
                  code: permCode.trim() || undefined,
                  description: permDesc.trim() || undefined,
                });
              }}
              disabled={!permName.trim() || createPermMutation.isPending}
            >
              {createPermMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…
                </>
              ) : (
                "Create Permission"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!deleteRoleTarget} onOpenChange={(v) => !v && setDeleteRoleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role <strong>"{deleteRoleTarget?.name}"</strong>?
              Administrators assigned to this role will lose associated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoleMutation.isPending}
              onClick={() => {
                if (deleteRoleTarget) deleteRoleMutation.mutate(deleteRoleTarget.id);
              }}
            >
              {deleteRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
