import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
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
  });

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
      });
    } else {
      setCurrentPost(null);
      setFormData({ title: "", content: "", tags: "" });
    }
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
      ...formData,
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
              <CardTitle>Posts</CardTitle>
              <CardDescription>Manage all posts for this site</CardDescription>
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
                    <h4 className="font-semibold text-foreground mb-1">{post.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span className="capitalize">{post.source}</span>
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
