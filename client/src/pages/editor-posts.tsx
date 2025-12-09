import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useSiteContext } from "@/components/base-path-provider";
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  LayoutGrid,
  List,
  Filter,
  LogOut,
  ExternalLink,
  Bot,
  Rss,
  PenLine,
  Image,
  Clock,
  Sparkles,
  CheckSquare,
  Square,
  Eye,
  BarChart3,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
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
import type { Site, Post, SiteAuthor } from "@shared/schema";

const POSTS_PER_PAGE = 10;

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 28 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    transition: { duration: 0.15 } 
  },
};

const sidebarVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
};

type SourceFilter = "all" | "manual" | "ai" | "rss";
type ViewMode = "grid" | "list";

const AI_SOURCES = ["ai", "ai-bulk", "topical-authority"];
const isAiSource = (source: string) => AI_SOURCES.includes(source);

const getRelativeTime = (date: Date | string | null | undefined) => {
  if (!date) return "Unknown";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Unknown";
  }
};

const getReadingTime = (content: string) => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return { wordCount, minutes };
};

export default function EditorPosts() {
  const { id: siteId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const siteContext = useSiteContext();

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    totalErrors: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    imageUrl: "",
    authorId: "" as string,
  });

  const { data: site } = useQuery<Site>({
    queryKey: ["/api/editor/sites", siteId],
    enabled: !!siteId,
  });

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "posts"],
    enabled: !!siteId,
  });

  const { data: authors } = useQuery<SiteAuthor[]>({
    queryKey: ["/api/sites", siteId, "authors"],
    enabled: !!siteId,
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    
    return posts.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSource = sourceFilter === "all" 
        || (sourceFilter === "ai" && isAiSource(post.source))
        || post.source === sourceFilter;
      
      return matchesSearch && matchesSource;
    });
  }, [posts, searchQuery, sourceFilter]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const stats = useMemo(() => {
    if (!posts) return { total: 0, manual: 0, ai: 0, rss: 0, totalViews: 0 };
    return {
      total: posts.length,
      manual: posts.filter(p => p.source === "manual").length,
      ai: posts.filter(p => isAiSource(p.source)).length,
      rss: posts.filter(p => p.source === "rss").length,
      totalViews: posts.reduce((sum, p) => sum + (p.viewCount || 0), 0),
    };
  }, [posts]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const openEditor = (post?: Post) => {
    if (post) {
      setCurrentPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        tags: post.tags.join(", "),
        imageUrl: post.imageUrl || "",
        authorId: post.authorId || "none",
      });
    } else {
      setCurrentPost(null);
      const defaultAuthor = authors?.find(a => a.isDefault);
      setFormData({ title: "", content: "", tags: "", imageUrl: "", authorId: defaultAuthor?.id || "none" });
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setCurrentPost(null);
    setFormData({ title: "", content: "", tags: "", imageUrl: "", authorId: "" });
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
          authorId: formData.authorId && formData.authorId !== "none" ? formData.authorId : null,
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
          authorId: formData.authorId && formData.authorId !== "none" ? formData.authorId : null,
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

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Check if all posts on current page are selected
  const allCurrentPageSelected = paginatedPosts.length > 0 && 
    paginatedPosts.every(p => selectedPosts.has(p.id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        paginatedPosts.forEach(p => newSet.delete(p.id));
        return newSet;
      });
    } else {
      // Select all on current page (add to existing selection)
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        paginatedPosts.forEach(p => newSet.add(p.id));
        return newSet;
      });
    }
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedPosts(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedPosts).map(id => 
          apiRequest("DELETE", `/api/editor/posts/${id}`, undefined)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      toast({ 
        title: "Success", 
        description: `${selectedPosts.size} post${selectedPosts.size > 1 ? 's' : ''} deleted` 
      });
      setBulkDeleteDialogOpen(false);
      exitBulkMode();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete posts", variant: "destructive" });
    }
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Error", description: "File too large (max 20MB)", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setCsvResult(null);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvContent.trim()) {
      toast({ title: "Error", description: "Please select a CSV file first", variant: "destructive" });
      return;
    }

    setCsvImporting(true);
    setCsvResult(null);

    try {
      const response = await apiRequest("POST", `/api/editor/sites/${siteId}/posts/import-csv`, {
        csvContent,
      });
      
      const result = await response.json();
      setCsvResult(result);
      
      if (result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
        toast({ 
          title: "Import Complete", 
          description: `Successfully imported ${result.imported} post${result.imported > 1 ? 's' : ''}` 
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to import CSV", variant: "destructive" });
    } finally {
      setCsvImporting(false);
    }
  };

  const closeCsvImport = () => {
    setCsvImportOpen(false);
    setCsvContent("");
    setCsvResult(null);
  };

  const downloadCsvTemplate = () => {
    const template = `title,description,tags,slug,imageUrl
"My First Post","This is the content of my first post.

You can use multiple lines in the description field when wrapped in quotes.

HTML or plain text are both supported.","tag1, tag2, tag3","/my-first-post","https://example.com/image1.jpg"
"Another Post","Another great article with interesting content.","news, updates","another-post",""
"Post Without Slug","The slug will be auto-generated from the title if left empty.","example","",""`;
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "posts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSourceIcon = (source: string) => {
    if (isAiSource(source)) return <Bot className="w-3.5 h-3.5" />;
    switch (source) {
      case "rss": return <Rss className="w-3.5 h-3.5" />;
      default: return <PenLine className="w-3.5 h-3.5" />;
    }
  };

  const getSourceLabel = (source: string) => {
    if (isAiSource(source)) {
      switch (source) {
        case "ai-bulk": return "AI Bulk";
        case "topical-authority": return "Topical AI";
        default: return "AI Generated";
      }
    }
    switch (source) {
      case "rss": return "RSS Import";
      default: return "Manual";
    }
  };

  const hasSiteContext = !!siteContext;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex">
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-72 bg-card/50 backdrop-blur-xl border-r z-40 flex flex-col"
        >
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              {site?.logoUrl ? (
                <img 
                  src={site.logoUrl} 
                  alt={site.title} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/10" 
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate" data-testid="text-site-title">
                  {site?.title || "Loading..."}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{site?.domain}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            <div className="space-y-1 mb-4">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 bg-primary text-primary-foreground"
                data-testid="nav-posts"
              >
                <FileText className="w-4 h-4" />
                <span className="flex-1 text-left">Posts</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-foreground/20 text-primary-foreground">
                  {stats.total}
                </span>
              </button>
              <button
                onClick={() => setLocation(`/editor/sites/${siteId}/analytics`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground"
                data-testid="nav-analytics"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="flex-1 text-left">Analytics</span>
              </button>
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Quick Stats
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl p-3 text-center border border-blue-500/20">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-500">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Posts</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{stats.manual}</p>
                  <p className="text-xs text-muted-foreground">Manual</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-violet-500">{stats.ai}</p>
                  <p className="text-xs text-muted-foreground">AI Generated</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{stats.rss}</p>
                  <p className="text-xs text-muted-foreground">RSS Imports</p>
                </div>
              </div>
            </motion.div>

            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
                Filter by Source
              </p>
              <div className="space-y-1">
                {[
                  { value: "all", label: "All Posts", icon: LayoutGrid, count: stats.total },
                  { value: "manual", label: "Manual", icon: PenLine, count: stats.manual },
                  { value: "ai", label: "AI Generated", icon: Bot, count: stats.ai },
                  { value: "rss", label: "RSS Imports", icon: Rss, count: stats.rss },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setSourceFilter(item.value as SourceFilter);
                      setCurrentPage(1);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                      sourceFilter === item.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`filter-${item.value}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      sourceFilter === item.value
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t space-y-2">
            {!hasSiteContext && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => setLocation("/editor")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sites
              </Button>
            )}
            {site && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => window.open(`https://${site.domain}`, "_blank")}
                data-testid="button-view-site"
              >
                <ExternalLink className="w-4 h-4" />
                View Live Site
              </Button>
            )}
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="shrink-0"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.aside>

        <main className="flex-1 ml-72 min-h-screen">
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b"
          >
            <div className="px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search posts by title or tag..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
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

                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode("list")}
                      data-testid="view-list"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode("grid")}
                      data-testid="view-grid"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant={bulkMode ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
                    data-testid="button-bulk-mode"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {bulkMode ? "Exit Select" : "Select"}
                  </Button>
                </div>

                {bulkMode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="gap-2"
                      data-testid="button-select-all"
                    >
                      {allCurrentPageSelected ? (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          Deselect Page ({paginatedPosts.length})
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4" />
                          Select Page ({paginatedPosts.length})
                        </>
                      )}
                    </Button>
                    
                    {selectedPosts.size > 0 && (
                      <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-1.5">
                        <span className="text-sm font-medium">
                          {selectedPosts.size} selected
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setBulkDeleteDialogOpen(true)}
                          data-testid="button-bulk-delete"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {!bulkMode && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setCsvImportOpen(true)}
                      className="gap-2"
                      data-testid="button-csv-import"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import CSV</span>
                    </Button>
                    <Button 
                      onClick={() => openEditor()} 
                      className="gap-2 shadow-lg shadow-primary/20"
                      data-testid="button-new-post"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Post</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.header>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={viewMode === "grid" 
                    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
                    : "space-y-3"
                  }
                >
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`bg-muted/50 animate-pulse rounded-2xl ${
                        viewMode === "grid" ? "h-64" : "h-24"
                      }`}
                    />
                  ))}
                </motion.div>
              ) : paginatedPosts.length > 0 ? (
                <motion.div
                  key={`posts-${sourceFilter}-${currentPage}`}
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className={viewMode === "grid" 
                    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
                    : "space-y-3"
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {paginatedPosts.map((post) => (
                      <motion.div
                        key={post.id}
                        variants={cardVariants}
                        layout
                        className="group"
                      >
                        {viewMode === "grid" ? (
                          <Card
                            className={`overflow-hidden hover-elevate transition-all duration-300 cursor-pointer h-full ${
                              bulkMode && selectedPosts.has(post.id) ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => bulkMode ? togglePostSelection(post.id) : openEditor(post)}
                            data-testid={`card-post-${post.id}`}
                          >
                            <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50">
                              {post.imageUrl ? (
                                <img 
                                  src={post.imageUrl} 
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Image className="w-12 h-12 text-muted-foreground/30" />
                                </div>
                              )}
                              {bulkMode && (
                                <div 
                                  className="absolute top-3 left-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={selectedPosts.has(post.id)}
                                    onCheckedChange={() => togglePostSelection(post.id)}
                                    className="h-5 w-5 bg-background/80 backdrop-blur-sm"
                                    data-testid={`checkbox-select-${post.id}`}
                                  />
                                </div>
                              )}
                              <div className="absolute top-3 right-3 flex gap-1">
                                <Badge 
                                  variant="secondary" 
                                  className="bg-background/80 backdrop-blur-sm text-xs gap-1"
                                >
                                  {getSourceIcon(post.source)}
                                  {getSourceLabel(post.source)}
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 
                                className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors"
                                data-testid={`text-post-title-${post.id}`}
                              >
                                {post.title}
                              </h3>
                              <p 
                                className="text-sm text-muted-foreground line-clamp-2 mb-3"
                                data-testid={`text-post-excerpt-${post.id}`}
                              >
                                {stripMarkdown(post.content, 100)}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span title={new Date(post.createdAt).toLocaleString()}>
                                    {getRelativeTime(post.createdAt)}
                                  </span>
                                </span>
                                <span className="text-muted-foreground/50">|</span>
                                <span>{getReadingTime(post.content).minutes} min read</span>
                                <span className="text-muted-foreground/50">|</span>
                                <span className="flex items-center gap-1 text-blue-500">
                                  <Eye className="w-3 h-3" />
                                  {(post.viewCount || 0).toLocaleString()}
                                </span>
                                {post.tags.length > 0 && (
                                  <>
                                    <span className="text-muted-foreground/50">|</span>
                                    <Tag className="w-3 h-3" />
                                    {post.tags[0]}
                                    {post.tags.length > 1 && ` +${post.tags.length - 1}`}
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card
                            className={`hover-elevate transition-all duration-300 ${
                              bulkMode && selectedPosts.has(post.id) ? "ring-2 ring-primary" : ""
                            } ${bulkMode ? "cursor-pointer" : ""}`}
                            onClick={() => bulkMode && togglePostSelection(post.id)}
                            data-testid={`card-post-${post.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {bulkMode && (
                                  <div 
                                    className="shrink-0 flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={selectedPosts.has(post.id)}
                                      onCheckedChange={() => togglePostSelection(post.id)}
                                      className="h-5 w-5"
                                      data-testid={`checkbox-select-${post.id}`}
                                    />
                                  </div>
                                )}
                                <div className="shrink-0 w-20 h-14 rounded-lg bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                                  {post.imageUrl ? (
                                    <img 
                                      src={post.imageUrl} 
                                      alt={post.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <FileText className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h3 
                                        className="font-medium line-clamp-1 mb-1"
                                        data-testid={`text-post-title-${post.id}`}
                                      >
                                        {post.title}
                                      </h3>
                                      <p 
                                        className="text-sm text-muted-foreground line-clamp-1 mb-2"
                                        data-testid={`text-post-excerpt-${post.id}`}
                                      >
                                        {stripMarkdown(post.content, 120)}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs gap-1 font-normal"
                                        >
                                          {getSourceIcon(post.source)}
                                          {getSourceLabel(post.source)}
                                        </Badge>
                                        <span 
                                          className="text-xs text-muted-foreground"
                                          data-testid={`text-post-date-${post.id}`}
                                          title={new Date(post.createdAt).toLocaleString()}
                                        >
                                          {getRelativeTime(post.createdAt)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {getReadingTime(post.content).minutes} min
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-blue-500">
                                          <Eye className="w-3 h-3" />
                                          {(post.viewCount || 0).toLocaleString()}
                                        </span>
                                        {post.tags.slice(0, 2).map((tag) => (
                                          <Badge 
                                            key={tag} 
                                            variant="secondary" 
                                            className="text-xs font-normal"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                        {post.tags.length > 2 && (
                                          <span className="text-xs text-muted-foreground">
                                            +{post.tags.length - 2} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {!bulkMode && (
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditor(post);
                                          }}
                                          data-testid={`button-edit-${post.id}`}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPostToDelete(post);
                                            setDeleteDialogOpen(true);
                                          }}
                                          data-testid={`button-delete-${post.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-20"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6">
                    {searchQuery || sourceFilter !== "all" ? (
                      <Search className="w-10 h-10 text-primary/50" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-primary/50" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery || sourceFilter !== "all" ? "No posts found" : "No posts yet"}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {searchQuery
                      ? "Try adjusting your search terms or filters"
                      : sourceFilter !== "all"
                      ? `No ${sourceFilter === "ai" ? "AI generated" : sourceFilter === "rss" ? "RSS imported" : "manual"} posts found`
                      : "Create your first post to get started with your content"}
                  </p>
                  {!searchQuery && sourceFilter === "all" && (
                    <Button 
                      onClick={() => openEditor()} 
                      size="lg"
                      className="gap-2"
                      data-testid="button-create-first"
                    >
                      <Plus className="w-5 h-5" />
                      Create Your First Post
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between mt-8 pt-6 border-t"
              >
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * POSTS_PER_PAGE) + 1} - {Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} posts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "ghost"}
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setCurrentPage(page)}
                          data-testid={`button-page-${page}`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {currentPost ? "Edit Post" : "Create New Post"}
            </DialogTitle>
            <DialogDescription>
              {currentPost ? "Update your post content and settings" : "Write and publish a new post for your site"}
            </DialogDescription>
          </DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter an engaging title..."
                className="text-lg"
                data-testid="input-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">Content</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Start writing your post content..."
                minHeight="350px"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="technology, news, tutorial"
                  data-testid="input-tags"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium">Featured Image URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted-foreground">Optional cover image for the post</p>
              </div>
            </div>
            {authors && authors.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="author" className="text-sm font-medium">Author</Label>
                <Select
                  value={formData.authorId}
                  onValueChange={(value) => setFormData({ ...formData, authorId: value })}
                >
                  <SelectTrigger data-testid="select-author">
                    <SelectValue placeholder="Select an author" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No author</SelectItem>
                    {authors.map((author) => (
                      <SelectItem key={author.id} value={author.id}>
                        {author.name} {author.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select the post author</p>
              </div>
            )}
          </motion.div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={closeEditor} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" data-testid="button-save">
              {currentPost ? (
                <>
                  <Edit className="w-4 h-4" />
                  Update Post
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Post
                </>
              )}
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
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPosts.size} Post{selectedPosts.size > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPosts.size} selected post{selectedPosts.size > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-bulk-delete"
            >
              Delete {selectedPosts.size} Post{selectedPosts.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={csvImportOpen} onOpenChange={(open) => !open && closeCsvImport()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Posts from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file with your posts. Required columns: title, description. Optional: tags.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-4 h-4" />
                <span>Need a template?</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadCsvTemplate}
                data-testid="button-download-template"
              >
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileSelect}
                disabled={csvImporting}
                data-testid="input-csv-file"
              />
              {csvContent && (
                <p className="text-sm text-muted-foreground">
                  File loaded: {csvContent.split('\n').length - 1} data row(s) detected
                </p>
              )}
            </div>

            {csvResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg ${
                  csvResult.imported > 0 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {csvResult.imported > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">
                      {csvResult.imported > 0 
                        ? `Successfully imported ${csvResult.imported} post${csvResult.imported > 1 ? 's' : ''}`
                        : "No posts imported"
                      }
                    </p>
                    {csvResult.skipped > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {csvResult.skipped} row{csvResult.skipped > 1 ? 's' : ''} skipped
                      </p>
                    )}
                    {csvResult.errors.length > 0 && (
                      <div className="mt-2 text-sm space-y-1">
                        <p className="text-muted-foreground font-medium">Issues:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {csvResult.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {csvResult.totalErrors > 5 && (
                            <li>...and {csvResult.totalErrors - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={closeCsvImport}
              disabled={csvImporting}
              data-testid="button-cancel-csv-import"
            >
              {csvResult?.imported ? "Close" : "Cancel"}
            </Button>
            {!csvResult?.imported && (
              <Button 
                onClick={handleCsvImport}
                disabled={!csvContent || csvImporting}
                className="gap-2"
                data-testid="button-import-csv"
              >
                {csvImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Posts
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
