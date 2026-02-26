"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPatch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "inactive";
  createdAt: string;
}

export default function UsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" as "admin" | "member" });
  const [formError, setFormError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push("/projects");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoading(true);
    apiGet<User[]>("/api/users")
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAdmin]);

  const refreshUsers = async () => {
    const d = await apiGet<User[]>("/api/users").catch(() => [] as User[]);
    setUsers(Array.isArray(d) ? d : []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.password.length < 8) { setFormError("Password must be at least 8 characters"); return; }
    setCreating(true);
    try {
      await apiPost<User>("/api/users", form);
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "", role: "member" });
      await refreshUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "member" : "admin";
    setUpdating(true);
    await apiPatch(`/api/users/${user._id}`, { role: newRole }).catch(console.error);
    setUpdating(false);
    await refreshUsers();
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    setUpdating(true);
    await apiPatch(`/api/users/${user._id}`, { status: newStatus }).catch(console.error);
    setUpdating(false);
    await refreshUsers();
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage team members and their roles</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Invite User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.status === "active" ? "success" : "destructive"}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleRole(u)} disabled={updating}>
                      Make {u.role === "admin" ? "Member" : "Admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.status === "active" ? "destructive" : "outline"}
                      onClick={() => toggleStatus(u)}
                      disabled={updating}
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Create a new team member account.</DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Password (min 8 chars)</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
