import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowLeft, Users, Globe, UserPlus, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Site } from "@shared/schema";

interface User {
  id: string;
  username: string;
  email: string | null;
  role: "admin" | "editor";
  status: string;
  createdAt: string;
}

interface UserSite {
  id: string;
  userId: string;
  siteId: string;
  permission: string;
}

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser, isAdmin } = useAuth();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSitesDialog, setShowSitesDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "editor" as "admin" | "editor",
    status: "active",
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
    enabled: isAdmin,
  });

  const { data: userSites, refetch: refetchUserSites } = useQuery<UserSite[]>({
    queryKey: ["/api/users", selectedUser?.id, "sites"],
    enabled: !!selectedUser && showSitesDialog,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<typeof formData> }) => {
      const res = await apiRequest("PUT", `/api/users/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const addUserToSiteMutation = useMutation({
    mutationFn: async (data: { userId: string; siteId: string; permission: string }) => {
      const res = await apiRequest("POST", `/api/users/${data.userId}/sites`, {
        siteId: data.siteId,
        permission: data.permission,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Site assigned successfully" });
      refetchUserSites();
    },
    onError: () => {
      toast({ title: "Failed to assign site", variant: "destructive" });
    },
  });

  const removeUserFromSiteMutation = useMutation({
    mutationFn: async (data: { userId: string; siteId: string }) => {
      await apiRequest("DELETE", `/api/users/${data.userId}/sites/${data.siteId}`);
    },
    onSuccess: () => {
      toast({ title: "Site removed successfully" });
      refetchUserSites();
    },
    onError: () => {
      toast({ title: "Failed to remove site", variant: "destructive" });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { userId: string; siteId: string; permission: string }) => {
      const res = await apiRequest("PUT", `/api/users/${data.userId}/sites/${data.siteId}`, {
        permission: data.permission,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Permission updated successfully" });
      refetchUserSites();
    },
    onError: () => {
      toast({ title: "Failed to update permission", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "editor",
      status: "active",
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      password: "",
      role: user.role,
      status: user.status,
    });
    setShowEditDialog(true);
  };

  const openSitesDialog = (user: User) => {
    setSelectedUser(user);
    setShowSitesDialog(true);
  };

  const assignedSiteIds = userSites?.map(us => us.siteId) || [];
  const availableSites = sites?.filter(s => !assignedSiteIds.includes(s.id)) || [];

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
          <p className="text-center text-white/50">
            You don't have permission to access this page.
          </p>
          <Button 
            className="w-full mt-4 bg-white text-black hover:bg-white/90"
            onClick={() => setLocation("/admin/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/3 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-2xl"
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/dashboard")}
                className="text-white/70 hover:text-white hover:bg-white/10"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-white" data-testid="text-page-title">User Management</h1>
                  <p className="text-xs text-white/50">Manage users and permissions</p>
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCreateDialog(true)} 
              className="bg-white text-black hover:bg-white/90"
              data-testid="button-add-user"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-white/70" />
                <h2 className="text-lg font-semibold text-white">Users</h2>
              </div>
              <p className="text-sm text-white/50 mt-1">
                All registered admin and editor users
              </p>
            </div>
            <div className="p-6">
              {usersLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Username</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`row-user-${user.id}`}>
                          <td className="py-4 px-4" data-testid={`text-username-${user.id}`}>
                            <span className="font-medium text-white">{user.username}</span>
                            {user.id === currentUser?.id && (
                              <Badge className="ml-2 bg-white/10 text-white/70 border border-white/10">You</Badge>
                            )}
                          </td>
                          <td className="py-4 px-4" data-testid={`text-email-${user.id}`}>
                            <span className="text-white/70">{user.email || <span className="text-white/30">-</span>}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              className={user.role === "admin" 
                                ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" 
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }
                              data-testid={`badge-role-${user.id}`}
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              className={user.status === "active"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-white/10 text-white/60 border border-white/10"
                              }
                              data-testid={`badge-status-${user.id}`}
                            >
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {user.role !== "admin" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openSitesDialog(user)}
                                  className="text-white/60 hover:text-white hover:bg-white/10"
                                  data-testid={`button-sites-${user.id}`}
                                >
                                  <Globe className="h-4 w-4 mr-1" />
                                  Sites
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(user)}
                                className="text-white/60 hover:text-white hover:bg-white/10"
                                data-testid={`button-edit-${user.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {user.id !== currentUser?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50">No users found</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white" data-testid="text-create-dialog-title">Create New User</DialogTitle>
            <DialogDescription className="text-white/50">Add a new admin or editor user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/70">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
                data-testid="input-create-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-white/70">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10">
                  <SelectItem value="editor" className="text-white hover:bg-white/10">Editor</SelectItem>
                  <SelectItem value="admin" className="text-white hover:bg-white/10">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-white/70 hover:text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(formData)}
              disabled={!formData.username || !formData.password || createUserMutation.isPending}
              className="bg-white text-black hover:bg-white/90"
              data-testid="button-confirm-create"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white" data-testid="text-edit-dialog-title">Edit User</DialogTitle>
            <DialogDescription className="text-white/50">Update user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username" className="text-white/70">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-white/70">Email (optional)</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="text-white/70">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-white/70">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10">
                  <SelectItem value="editor" className="text-white hover:bg-white/10">Editor</SelectItem>
                  <SelectItem value="admin" className="text-white hover:bg-white/10">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-white/70">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10">
                  <SelectItem value="active" className="text-white hover:bg-white/10">Active</SelectItem>
                  <SelectItem value="inactive" className="text-white hover:bg-white/10">Inactive</SelectItem>
                  <SelectItem value="pending" className="text-white hover:bg-white/10">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-white/70 hover:text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedUser) return;
                const updates: any = {};
                if (formData.username !== selectedUser.username) updates.username = formData.username;
                if (formData.email !== (selectedUser.email || "")) updates.email = formData.email;
                if (formData.password) updates.password = formData.password;
                if (formData.role !== selectedUser.role) updates.role = formData.role;
                if (formData.status !== selectedUser.status) updates.status = formData.status;
                updateUserMutation.mutate({ id: selectedUser.id, updates });
              }}
              disabled={updateUserMutation.isPending}
              className="bg-white text-black hover:bg-white/90"
              data-testid="button-confirm-edit"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white" data-testid="text-delete-dialog-title">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Are you sure you want to delete <strong className="text-white">{selectedUser?.username}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              className="bg-red-500 text-white hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSitesDialog} onOpenChange={setShowSitesDialog}>
        <DialogContent className="max-w-2xl bg-black/95 backdrop-blur-2xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white" data-testid="text-sites-dialog-title">
              Manage Sites for {selectedUser?.username}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Assign or remove site access for this editor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-white/70">Assigned Sites</h4>
              {userSites && userSites.length > 0 ? (
                <div className="space-y-2">
                  {userSites.map((us) => {
                    const site = sites?.find(s => s.id === us.siteId);
                    return (
                      <div 
                        key={us.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                        data-testid={`assigned-site-${us.siteId}`}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-white/50" />
                          <span className="font-medium text-white">{site?.title || us.siteId}</span>
                          <span className="text-sm text-white/50">{site?.domain}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={us.permission}
                            onValueChange={(permission) => {
                              updatePermissionMutation.mutate({
                                userId: selectedUser!.id,
                                siteId: us.siteId,
                                permission,
                              });
                            }}
                          >
                            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white" data-testid={`select-permission-${us.siteId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/95 border-white/10">
                              <SelectItem value="posts_only" className="text-white hover:bg-white/10">Posts Only</SelectItem>
                              <SelectItem value="edit" className="text-white hover:bg-white/10">Editor</SelectItem>
                              <SelectItem value="manage" className="text-white hover:bg-white/10">Manager</SelectItem>
                              <SelectItem value="view" className="text-white hover:bg-white/10">View Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUserFromSiteMutation.mutate({
                              userId: selectedUser!.id,
                              siteId: us.siteId,
                            })}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            data-testid={`button-remove-site-${us.siteId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/50">No sites assigned</p>
              )}
            </div>

            {availableSites.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-white/70">Add Site Access</h4>
                <div className="space-y-2">
                  {availableSites.map((site) => (
                    <div 
                      key={site.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-dashed border-white/20"
                      data-testid={`available-site-${site.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-white/50" />
                        <span className="font-medium text-white">{site.title}</span>
                        <span className="text-sm text-white/50">{site.domain}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue="posts_only"
                          onValueChange={(permission) => {
                            addUserToSiteMutation.mutate({
                              userId: selectedUser!.id,
                              siteId: site.id,
                              permission,
                            });
                          }}
                        >
                          <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white" data-testid={`select-permission-${site.id}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/95 border-white/10">
                            <SelectItem value="posts_only" className="text-white hover:bg-white/10">Posts Only</SelectItem>
                            <SelectItem value="edit" className="text-white hover:bg-white/10">Editor</SelectItem>
                            <SelectItem value="manage" className="text-white hover:bg-white/10">Manager</SelectItem>
                            <SelectItem value="view" className="text-white hover:bg-white/10">View Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSitesDialog(false)} className="bg-white text-black hover:bg-white/90">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
