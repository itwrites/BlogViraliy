import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <Button 
              className="w-full mt-4"
              onClick={() => setLocation("/admin/dashboard")}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">User Management</h1>
                <p className="text-xs text-muted-foreground">Manage users and permissions</p>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-add-user">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>
              All registered admin and editor users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-username-${user.id}`}>
                        {user.username}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="ml-2">You</Badge>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>
                        {user.email || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"} data-testid={`badge-role-${user.id}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.status === "active" ? "default" : "secondary"}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== "admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSitesDialog(user)}
                              data-testid={`button-sites-${user.id}`}
                            >
                              <Globe className="h-4 w-4 mr-1" />
                              Sites
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteDialog(true);
                              }}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-create-dialog-title">Create New User</DialogTitle>
            <DialogDescription>Add a new admin or editor user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                data-testid="input-create-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-edit-dialog-title">Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email (optional)</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
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
              data-testid="button-confirm-edit"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.username}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Site Assignment Dialog */}
      <Dialog open={showSitesDialog} onOpenChange={setShowSitesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-sites-dialog-title">
              Manage Sites for {selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Assign or remove site access for this editor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Assigned Sites */}
            <div>
              <h4 className="text-sm font-medium mb-2">Assigned Sites</h4>
              {userSites && userSites.length > 0 ? (
                <div className="space-y-2">
                  {userSites.map((us) => {
                    const site = sites?.find(s => s.id === us.siteId);
                    return (
                      <div 
                        key={us.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                        data-testid={`assigned-site-${us.siteId}`}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{site?.title || us.siteId}</span>
                          <span className="text-sm text-muted-foreground">{site?.domain}</span>
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
                            <SelectTrigger className="w-[130px]" data-testid={`select-permission-${us.siteId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="posts_only">Posts Only</SelectItem>
                              <SelectItem value="edit">Editor</SelectItem>
                              <SelectItem value="manage">Manager</SelectItem>
                              <SelectItem value="view">View Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeUserFromSiteMutation.mutate({
                              userId: selectedUser!.id,
                              siteId: us.siteId,
                            })}
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
                <p className="text-sm text-muted-foreground">No sites assigned</p>
              )}
            </div>

            {/* Available Sites to Add */}
            {availableSites.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Add Site Access</h4>
                <div className="space-y-2">
                  {availableSites.map((site) => (
                    <div 
                      key={site.id}
                      className="flex items-center justify-between p-3 border rounded-md border-dashed"
                      data-testid={`available-site-${site.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{site.title}</span>
                        <span className="text-sm text-muted-foreground">{site.domain}</span>
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
                          <SelectTrigger className="w-[140px]" data-testid={`select-permission-${site.id}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="posts_only">Posts Only</SelectItem>
                            <SelectItem value="edit">Editor</SelectItem>
                            <SelectItem value="manage">Manager</SelectItem>
                            <SelectItem value="view">View Only</SelectItem>
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
            <Button onClick={() => setShowSitesDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
