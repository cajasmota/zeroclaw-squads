"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";

export default function UsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" as "admin" | "member" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push("/projects");
  }, [authLoading, isAdmin, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.password.length < 8) { setFormError("Password must be at least 8 characters"); return; }
    createUserMutation.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: "", email: "", password: "", role: "member" });
      },
      onError: (err) => setFormError(err.message ?? "Failed to create user"),
    });
  };

  const toggleRole = (user: { _id: string; role: string }) => {
    const newRole = user.role === "admin" ? "member" : "admin";
    updateUserMutation.mutate({ id: user._id, payload: { role: newRole as "admin" | "member" } });
  };

  const toggleStatus = (user: { _id: string; status: string }) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    updateUserMutation.mutate({ id: user._id, payload: { status: newStatus as "active" | "inactive" } });
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
                    <Button size="sm" variant="outline" onClick={() => toggleRole(u)}>
                      Make {u.role === "admin" ? "Member" : "Admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.status === "active" ? "destructive" : "outline"}
                      onClick={() => toggleStatus(u)}
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
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
