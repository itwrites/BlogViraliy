import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Site } from "@shared/schema";
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
import { useState } from "react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const handleDelete = async () => {
    if (!siteToDelete) return;

    try {
      await apiRequest("DELETE", `/api/sites/${siteToDelete.id}`, undefined);
      toast({ title: "Site deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    } catch (error) {
      toast({ title: "Failed to delete site", variant: "destructive" });
    }
  };

  const openDeleteDialog = (site: Site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-app-title">ChameleonWeb</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-app-subtitle">Multi-Domain Content Platform</p>
          </div>
          <Button
            onClick={() => setLocation("/admin/sites/new")}
            data-testid="button-add-site"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Site
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2" data-testid="text-section-title">Your Websites</h2>
          <p className="text-muted-foreground" data-testid="text-section-description">Manage all your multi-tenant websites from one dashboard</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sites && sites.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <Card key={site.id} data-testid={`card-site-${site.id}`} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`text-site-title-${site.id}`}>{site.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Globe className="h-3 w-3" />
                        <span className="font-mono text-xs truncate" data-testid={`text-site-domain-${site.id}`}>{site.domain}</span>
                      </CardDescription>
                    </div>
                    {site.logoUrl && (
                      <img 
                        src={site.logoUrl} 
                        alt={`${site.title} logo`} 
                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                        data-testid={`img-site-logo-${site.id}`}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/admin/sites/${site.id}`)}
                      data-testid={`button-edit-${site.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openDeleteDialog(site)}
                      data-testid={`button-delete-${site.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" data-testid="icon-empty-state" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-state-title">No websites yet</h3>
              <p className="text-muted-foreground text-center mb-4" data-testid="text-empty-state-description">
                Get started by creating your first multi-tenant website
              </p>
              <Button onClick={() => setLocation("/admin/sites/new")} data-testid="button-add-first-site">
                <Plus className="h-4 w-4 mr-2" />
                Add New Site
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete Website</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-description">
              Are you sure you want to delete <strong data-testid="text-delete-site-name">{siteToDelete?.title}</strong>? This will permanently remove all posts and configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
