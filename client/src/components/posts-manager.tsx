import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, FileText, ChevronDown, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Post } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface PostsManagerProps {
  siteId: string;
}

export function PostsManager({ siteId }: PostsManagerProps) {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    imageUrl: "",
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    canonicalUrl: "",
    noindex: false,
  });
  
  const [seoOpen, setSeoOpen] = useState(false);

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/sites", siteId, "posts"],
  });

  const openEditor = (post?: Post) => {
    if (post) {
      setCurrentPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        tags: post.tags.join(", "),
        imageUrl: post.imageUrl || "",
        metaTitle: post.metaTitle || "",
        metaDescription: post.metaDescription || "",
        ogImage: post.ogImage || "",
        canonicalUrl: post.canonicalUrl || "",
        noindex: post.noindex || false,
      });
    } else {
      setCurrentPost(null);
      setFormData({ title: "", content: "", tags: "", imageUrl: "", metaTitle: "", metaDescription: "", ogImage: "", canonicalUrl: "", noindex: false });
    }
    setSeoOpen(false);
    setEditorOpen(true);
  };

  const handleSavePost = async () => {
    const tags = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const postData = {
      title: formData.title,
      content: formData.content,
      imageUrl: formData.imageUrl || null,
      metaTitle: formData.metaTitle || null,
      metaDescription: formData.metaDescription || null,
      ogImage: formData.ogImage || null,
      canonicalUrl: formData.canonicalUrl || null,
      noindex: formData.noindex,
      tags,
      slug,
      siteId,
      source: "manual",
    };

    try {
      if (currentPost) {
        await apiRequest("PUT", `/api/posts/${currentPost.id}`, postData);
        toast({ title: "Post updated successfully" });
      } else {
        await apiRequest("POST", "/api/posts", postData);
        toast({ title: "Post created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "posts"] });
      setEditorOpen(false);
    } catch (error) {
      toast({ title: "Failed to save post", variant: "destructive" });
    }
  };

  const openDeleteDialog = (post: Post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      await apiRequest("DELETE", `/api/posts/${postToDelete.id}`, undefined);
      toast({ title: "Post deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "posts"] });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error) {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle data-testid="text-posts-title">Posts</CardTitle>
              <CardDescription data-testid="text-posts-description">Manage all posts for this site</CardDescription>
            </div>
            <Button onClick={() => openEditor()} data-testid="button-add-post">
              <Plus className="h-4 w-4 mr-2" />
              Add Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-muted rounded" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                  data-testid={`post-item-${post.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1" data-testid={`text-post-title-${post.id}`}>{post.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono" data-testid={`text-post-date-${post.id}`}>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span className="capitalize" data-testid={`text-post-source-${post.id}`}>{post.source}</span>
                      {post.tags.length > 0 && (
                        <div className="flex gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-accent rounded-full text-accent-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditor(post)}
                      data-testid={`button-edit-post-${post.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(post)}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">Create your first post or enable automation</p>
              <Button onClick={() => openEditor()} data-testid="button-add-first-post">
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentPost ? "Edit Post" : "Create New Post"}</DialogTitle>
            <DialogDescription>
              Write engaging content for your audience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="postTitle">Title</Label>
              <Input
                id="postTitle"
                data-testid="input-post-title"
                placeholder="Enter post title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postContent">Content</Label>
              <Textarea
                id="postContent"
                data-testid="textarea-post-content"
                placeholder="Write your post content here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postTags">Tags</Label>
              <Input
                id="postTags"
                data-testid="input-post-tags"
                placeholder="technology, tutorial, guide (comma-separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postImage">Image URL (Optional)</Label>
              <Input
                id="postImage"
                data-testid="input-post-image"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
              {formData.imageUrl && (
                <div className="mt-2 rounded-md overflow-hidden border">
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-cover" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }} />
                </div>
              )}
            </div>
            
            <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 border rounded-md" data-testid="button-toggle-seo">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span className="font-medium">SEO Settings</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    data-testid="input-meta-title"
                    placeholder="Custom title for search engines (defaults to post title)"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 50-60 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    data-testid="textarea-meta-description"
                    placeholder="Brief description for search engine results"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 150-160 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogImage">Social Share Image URL</Label>
                  <Input
                    id="ogImage"
                    data-testid="input-og-image"
                    placeholder="https://example.com/social-image.jpg"
                    value={formData.ogImage}
                    onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 1200x630 pixels for optimal social sharing</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl">Canonical URL</Label>
                  <Input
                    id="canonicalUrl"
                    data-testid="input-canonical-url"
                    placeholder="https://example.com/original-post (if republishing)"
                    value={formData.canonicalUrl}
                    onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Use if this content originally appeared elsewhere</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label>Hide from Search Engines</Label>
                    <p className="text-xs text-muted-foreground">Add noindex meta tag to prevent search engine indexing</p>
                  </div>
                  <Switch
                    data-testid="switch-noindex"
                    checked={formData.noindex}
                    onCheckedChange={(checked) => setFormData({ ...formData, noindex: checked })}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)} data-testid="button-cancel-post">
                Cancel
              </Button>
              <Button onClick={handleSavePost} data-testid="button-publish-post">
                Publish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{postToDelete?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-post">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete-post">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
