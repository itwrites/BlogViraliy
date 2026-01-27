import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
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
  const { user: currentUser, isAdmin, isOwner, isLoading: authLoading } = useAuth();
  
  // Redirect owners to owner dashboard - they should not access admin pages
  useEffect(() => {
    if (!authLoading && isOwner) {
      setLocation("/owner");
    }
  }, [authLoading, isOwner, setLocation]);
  
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="rounded-2xl bg-white border border-border shadow-sm p-6">
          <p className="text-center text-muted-foreground/80">
            You don't have permission to access this page.
          </p>
          <Button 
            className="w-full mt-4"
            onClick={() => setLocation("/admin/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/3 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/5 via-pink-400/5 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-50 border-b border-border bg-sidebar backdrop-blur-xl"
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/dashboard")}
                className="text-muted-foreground/80 hover:text-foreground hover:bg-muted"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border flex items-center justify-center">
                  <Shield className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground" data-testid="text-page-title">User Management</h1>
                  <p className="text-xs text-muted-foreground/80">Manage users and permissions</p>
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCreateDialog(true)} 
              data-testid="button-add-user"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-2xl bg-white border border-border shadow-sm">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground/80" />
                <h2 className="text-lg font-semibold text-foreground">Users</h2>
              </div>
              <p className="text-sm text-muted-foreground/80 mt-1">
                All registered admin and editor users
              </p>
            </div>
            <div className="p-6">
              {usersLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground/80">Username</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground/80">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground/80">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground/80">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground/80">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/40 transition-colors" data-testid={`row-user-${user.id}`}>
                          <td className="py-4 px-4" data-testid={`text-username-${user.id}`}>
                            <span className="font-medium text-foreground">{user.username}</span>
                            {user.id === currentUser?.id && (
                              <Badge className="ml-2 bg-muted text-muted-foreground/80 border border-border">You</Badge>
                            )}
                          </td>
                          <td className="py-4 px-4" data-testid={`text-email-${user.id}`}>
                            <span className="text-muted-foreground/80">{user.email || <span className="text-muted-foreground/70">-</span>}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              className={user.role === "admin" 
                                ? "bg-violet-50 text-violet-700 border border-violet-200" 
                                : "bg-primary/10 text-primary border border-primary/20"
                              }
                              data-testid={`badge-role-${user.id}`}
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              className={user.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-muted text-muted-foreground/80 border border-border"
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
                                  className="text-muted-foreground/80 hover:text-foreground hover:bg-muted"
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
                                className="text-muted-foreground/80 hover:text-foreground hover:bg-muted"
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
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground/80">No users found</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground" data-testid="text-create-dialog-title">Create New User</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">Add a new admin or editor user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground/80">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40"
                data-testid="input-create-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground/80">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground/80">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40"
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-muted-foreground/80">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-white border-border text-foreground" data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-border">
                  <SelectItem value="editor" className="text-foreground focus:bg-muted">Editor</SelectItem>
                  <SelectItem value="admin" className="text-foreground focus:bg-muted">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted">
              Cancel
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(formData)}
              disabled={!formData.username || !formData.password || createUserMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground" data-testid="text-edit-dialog-title">Edit User</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">Update user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username" className="text-muted-foreground/80">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40"
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-muted-foreground/80">Email (optional)</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40"
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="text-muted-foreground/80">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40"
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-muted-foreground/80">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-white border-border text-foreground" data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-border">
                  <SelectItem value="editor" className="text-foreground focus:bg-muted">Editor</SelectItem>
                  <SelectItem value="admin" className="text-foreground focus:bg-muted">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-muted-foreground/80">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-white border-border text-foreground" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-border">
                  <SelectItem value="active" className="text-foreground focus:bg-muted">Active</SelectItem>
                  <SelectItem value="inactive" className="text-foreground focus:bg-muted">Inactive</SelectItem>
                  <SelectItem value="pending" className="text-foreground focus:bg-muted">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  const updates: Partial<typeof formData> = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    status: formData.status,
                  };
                  if (formData.password) {
                    updates.password = formData.password;
                  }
                  updateUserMutation.mutate({ id: selectedUser.id, updates });
                }
              }}
              disabled={updateUserMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete User?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone. This will permanently delete{" "}
              <strong className="text-foreground">{selectedUser?.username}</strong> and remove all their site assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/70">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSitesDialog} onOpenChange={setShowSitesDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Manage Sites for {selectedUser?.username}</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Assign sites and set permissions for this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            {userSites && userSites.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Assigned Sites</h4>
                {userSites.map((userSite) => {
                  const site = sites?.find(s => s.id === userSite.siteId);
                  return (
                    <div key={userSite.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{site?.title || "Unknown Site"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={userSite.permission}
                          onValueChange={(value) => 
                            updatePermissionMutation.mutate({
                              userId: selectedUser!.id,
                              siteId: userSite.siteId,
                              permission: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-32 h-8 bg-white border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-border">
                            <SelectItem value="view" className="text-foreground">View Only</SelectItem>
                            <SelectItem value="posts_only" className="text-foreground">Articles Only</SelectItem>
                            <SelectItem value="edit" className="text-foreground">Editor</SelectItem>
                            <SelectItem value="manage" className="text-foreground">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => 
                            removeUserFromSiteMutation.mutate({
                              userId: selectedUser!.id,
                              siteId: userSite.siteId,
                            })
                          }
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {availableSites.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Available Sites</h4>
                {availableSites.map((site) => (
                  <div key={site.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-foreground">{site.title}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => 
                        addUserToSiteMutation.mutate({
                          userId: selectedUser!.id,
                          siteId: site.id,
                          permission: "view",
                        })
                      }
                      className="border-border text-foreground hover:bg-muted"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!userSites?.length && !availableSites.length && (
              <div className="text-center py-8 text-muted-foreground/80">
                No sites available to assign
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
