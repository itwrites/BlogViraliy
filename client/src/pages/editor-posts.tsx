import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { stripMarkdown } from "@/lib/strip-markdown";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Globe,
  Search,
  X,
} from "lucide-react";
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
import type { Site, Post } from "@shared/schema";

const listItem = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
};

export default function EditorPosts() {
  const { id: siteId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    imageUrl: "",
  });

  const { data: site } = useQuery<Site>({
    queryKey: ["/api/editor/sites", siteId],
    enabled: !!siteId,
  });

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "posts"],
    enabled: !!siteId,
  });

  const filteredPosts = posts?.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openEditor = (post?: Post) => {
    if (post) {
      setCurrentPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        tags: post.tags.join(", "),
        imageUrl: post.imageUrl || "",
      });
    } else {
      setCurrentPost(null);
      setFormData({ title: "", content: "", tags: "", imageUrl: "" });
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setCurrentPost(null);
    setFormData({ title: "", content: "", tags: "", imageUrl: "" });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (currentPost) {
        await apiRequest("PUT", `/api/editor/posts/${currentPost.id}`, {
          title: formData.title,
          content: formData.content,
          tags: tagsArray,
          imageUrl: formData.imageUrl || null,
          slug,
        });
        toast({ title: "Success", description: "Post updated successfully" });
      } else {
        await apiRequest("POST", `/api/editor/sites/${siteId}/posts`, {
          siteId,
          title: formData.title,
          content: formData.content,
          tags: tagsArray,
          imageUrl: formData.imageUrl || null,
          slug,
          source: "manual",
        });
        toast({ title: "Success", description: "Post created successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      closeEditor();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save post", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      await apiRequest("DELETE", `/api/editor/posts/${postToDelete.id}`, undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      toast({ title: "Success", description: "Post deleted successfully" });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl"
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/editor")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                {site?.logoUrl ? (
                  <img src={site.logoUrl} alt={site.title} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold tracking-tight" data-testid="text-site-title">
                    {site?.title || "Loading..."}
                  </h1>
                  <p className="text-xs text-muted-foreground">Manage posts</p>
                </div>
              </div>
            </div>
            <Button onClick={() => openEditor()} className="gap-2" data-testid="button-new-post">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Post</span>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
              data-testid="input-search"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredPosts && filteredPosts.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  variants={listItem}
                  layout
                  className="group"
                >
                  <Card
                    className="hover-elevate transition-all duration-200 ios-shadow"
                    data-testid={`card-post-${post.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium mb-1 line-clamp-1" data-testid={`text-post-title-${post.id}`}>
                            {post.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2" data-testid={`text-post-excerpt-${post.id}`}>
                            {stripMarkdown(post.content, 120)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono" data-testid={`text-post-date-${post.id}`}>
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditor(post)}
                            data-testid={`button-edit-${post.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPostToDelete(post);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-${post.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? "No posts found" : "No posts yet"}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-4">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Create your first post to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => openEditor()} data-testid="button-create-first">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            )}
          </motion.div>
        )}
      </main>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentPost ? "Edit Post" : "New Post"}</DialogTitle>
            <DialogDescription>
              {currentPost ? "Update your post content" : "Create a new post for this site"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter post title..."
                data-testid="input-title"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Start writing your post content..."
                minHeight="350px"
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="technology, news, tutorial"
                data-testid="input-tags"
              />
            </div>
            <div>
              <Label htmlFor="imageUrl">Featured Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-image-url"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditor} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save">
              {currentPost ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
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
