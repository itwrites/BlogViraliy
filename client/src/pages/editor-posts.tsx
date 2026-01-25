import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { TopicalAuthority } from "@/components/topical-authority";
import { BulkGeneration } from "@/components/bulk-generation";
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
  Settings,
  BookOpen,
  Users,
} from "lucide-react";

type ActiveTab = "posts" | "topical" | "bulk" | "ai" | "authors";
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
import type { Site, Post, SiteAuthor, ArticleRole } from "@shared/schema";

const ARTICLE_ROLES: { value: ArticleRole; label: string; description: string }[] = [
  { value: "general", label: "General", description: "Standard blog post" },
  { value: "pillar", label: "Pillar", description: "Comprehensive cornerstone content" },
  { value: "support", label: "Support", description: "Supporting content for pillars" },
  { value: "long_tail", label: "Long-tail", description: "Specific keyword targeting" },
  { value: "rankings", label: "Rankings", description: "Top N lists with rankings" },
  { value: "best_of", label: "Best Of", description: "Curated recommendations" },
  { value: "comparison", label: "Comparison", description: "Head-to-head comparisons" },
  { value: "review", label: "Review", description: "Product/service reviews" },
  { value: "conversion", label: "Conversion", description: "Sales-focused content" },
  { value: "case_study", label: "Case Study", description: "Success stories with data" },
  { value: "benchmark", label: "Benchmark", description: "Research and analysis" },
  { value: "framework", label: "Framework", description: "Methodologies and models" },
  { value: "whitepaper", label: "Whitepaper", description: "In-depth thought leadership" },
  { value: "how_to", label: "How To", description: "Step-by-step tutorials" },
  { value: "faq", label: "FAQ", description: "Question and answer format" },
  { value: "listicle", label: "Listicle", description: "Engaging list format" },
  { value: "news", label: "News", description: "Timely news coverage" },
];

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
  const { user, logout, isOwner, isLoading: authLoading } = useAuth();
  
  const siteContext = useSiteContext();

  const [activeTab, setActiveTab] = useState<ActiveTab>("posts");
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
    articleRole: "general" as ArticleRole,
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
        articleRole: (post.articleRole as ArticleRole) || "general",
      });
    } else {
      setCurrentPost(null);
      const defaultAuthor = authors?.find(a => a.isDefault);
      setFormData({ title: "", content: "", tags: "", imageUrl: "", authorId: defaultAuthor?.id || "none", articleRole: "general" });
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setCurrentPost(null);
    setFormData({ title: "", content: "", tags: "", imageUrl: "", authorId: "", articleRole: "general" });
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
          articleRole: formData.articleRole,
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
          articleRole: formData.articleRole,
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

  const allCurrentPageSelected = paginatedPosts.length > 0 && 
    paginatedPosts.every(p => selectedPosts.has(p.id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        paginatedPosts.forEach(p => newSet.delete(p.id));
        return newSet;
      });
    } else {
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
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
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

      <div className="relative z-10 flex">
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/60 z-40 flex flex-col"
        >
          <div className="p-6 border-b border-gray-200/60">
            <div className="flex items-center gap-3">
              {site?.logoUrl ? (
                <img 
                  src={site.logoUrl} 
                  alt={site.title} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-200" 
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate text-gray-900" data-testid="text-site-title">
                  {site?.title || "Loading..."}
                </h1>
                <p className="text-xs text-gray-500 truncate">{site?.domain}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/admin/sites/${siteId}/settings`)}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                data-testid="button-site-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            <div className="space-y-1 mb-4">
              <button
                onClick={() => setActiveTab("posts")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === "posts" ? "bg-gray-100 text-gray-900 shadow-sm" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                }`}
                data-testid="nav-posts"
              >
                <FileText className="w-4 h-4" />
                <span className="flex-1 text-left">Posts</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  activeTab === "posts" ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {stats.total}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("topical")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === "topical" ? "bg-gray-100 text-gray-900 shadow-sm" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                }`}
                data-testid="nav-topical"
              >
                <BookOpen className="w-4 h-4" />
                <span className="flex-1 text-left">Topical Authority</span>
              </button>
              <button
                onClick={() => setActiveTab("bulk")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === "bulk" ? "bg-gray-100 text-gray-900 shadow-sm" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                }`}
                data-testid="nav-bulk"
              >
                <Sparkles className="w-4 h-4" />
                <span className="flex-1 text-left">Bulk Generation</span>
              </button>
              <button
                onClick={() => setLocation(`/admin/sites/${siteId}/analytics`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                data-testid="nav-analytics"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="flex-1 text-left">Analytics</span>
              </button>
            </div>

            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-3">
              Quick Stats
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Total Views</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-gray-200/60 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Posts</p>
                </div>
                <div className="bg-white border border-gray-200/60 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-emerald-600">{stats.manual}</p>
                  <p className="text-xs text-gray-500">Manual</p>
                </div>
                <div className="bg-white border border-gray-200/60 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-violet-600">{stats.ai}</p>
                  <p className="text-xs text-gray-500">AI Generated</p>
                </div>
                <div className="bg-white border border-gray-200/60 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-orange-600">{stats.rss}</p>
                  <p className="text-xs text-gray-500">RSS Imports</p>
                </div>
              </div>
            </motion.div>

            <div className="pt-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-3">
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
                        ? "bg-gray-100 text-gray-900 shadow-sm"
                        : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                    }`}
                    data-testid={`filter-${item.value}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      sourceFilter === item.value
                        ? "bg-gray-200 text-gray-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200/60 space-y-2 bg-gray-50/50">
            {!hasSiteContext && (
              <Button
                variant="ghost"
                onClick={() => setLocation("/admin")}
                className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                data-testid="button-back-editor"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sites
              </Button>
            )}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200/60 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.aside>

        <main className="flex-1 ml-72">
          {activeTab === "posts" && (
          <>
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl"
          >
            <div className="px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:ring-gray-200"
                      data-testid="input-search"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bulkMode ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={exitBulkMode}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        data-testid="button-exit-bulk"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        disabled={selectedPosts.size === 0}
                        className="bg-red-500 text-white hover:bg-red-600"
                        data-testid="button-bulk-delete"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete ({selectedPosts.size})
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center rounded-lg border border-gray-200 p-1 bg-gray-50">
                        <button
                          onClick={() => setViewMode("list")}
                          className={`p-1.5 rounded transition-colors ${
                            viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                          }`}
                          data-testid="button-view-list"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`p-1.5 rounded transition-colors ${
                            viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                          }`}
                          data-testid="button-view-grid"
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBulkMode(true)}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        data-testid="button-bulk-mode"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Select
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCsvImportOpen(true)}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        data-testid="button-import-csv"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => openEditor()}
                        data-testid="button-new-post"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Post
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.header>

          <div className="p-8">
            {bulkMode && paginatedPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/60 shadow-sm"
              >
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={toggleSelectAll}
                  className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:text-white"
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-gray-600">
                  {allCurrentPageSelected 
                    ? `All ${paginatedPosts.length} posts on this page selected`
                    : `Select all ${paginatedPosts.length} posts on this page`
                  }
                </span>
                {selectedPosts.size > 0 && (
                  <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
                    {selectedPosts.size} selected total
                  </Badge>
                )}
              </motion.div>
            )}

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
                      className={`bg-white animate-pulse rounded-xl border border-gray-200/60 ${
                        viewMode === "grid" ? "h-48" : "h-24"
                      }`}
                    />
                  ))}
                </motion.div>
              ) : paginatedPosts.length > 0 ? (
                <motion.div
                  key="posts"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className={viewMode === "grid" 
                    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
                    : "space-y-3"
                  }
                >
                  <AnimatePresence>
                    {paginatedPosts.map((post) => (
                      <motion.div
                        key={post.id}
                        variants={cardVariants}
                        layout
                        data-testid={`card-post-${post.id}`}
                      >
                        {viewMode === "grid" ? (
                          <div
                            className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md bg-white border border-gray-200/60 hover:border-gray-300 ${
                              bulkMode && selectedPosts.has(post.id) ? "ring-2 ring-blue-500" : ""
                            }`}
                            onClick={() => bulkMode ? togglePostSelection(post.id) : openEditor(post)}
                          >
                            {post.imageUrl ? (
                              <div className="aspect-video relative overflow-hidden">
                                <img
                                  src={post.imageUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {bulkMode && (
                                  <div className="absolute top-2 left-2">
                                    <Checkbox
                                      checked={selectedPosts.has(post.id)}
                                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="aspect-video relative bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                                <Image className="w-12 h-12 text-gray-300" />
                                {bulkMode && (
                                  <div className="absolute top-2 left-2">
                                    <Checkbox
                                      checked={selectedPosts.has(post.id)}
                                      className="border-gray-400 data-[state=checked]:bg-gray-900 data-[state=checked]:text-white"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="p-4">
                              <h3 
                                className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors"
                                data-testid={`text-post-title-${post.id}`}
                              >
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-xs border ${
                                  isAiSource(post.source)
                                    ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                                    : post.source === "rss"
                                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                }`}>
                                  {getSourceIcon(post.source)}
                                  <span className="ml-1">{getSourceLabel(post.source)}</span>
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {getRelativeTime(post.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md bg-white border border-gray-200/60 hover:border-gray-300 ${
                              bulkMode && selectedPosts.has(post.id) ? "ring-2 ring-blue-500" : ""
                            }`}
                            onClick={() => bulkMode ? togglePostSelection(post.id) : openEditor(post)}
                          >
                            <div className="p-4">
                              <div className="flex items-start gap-4">
                                {bulkMode && (
                                  <div className="pt-1">
                                    <Checkbox
                                      checked={selectedPosts.has(post.id)}
                                      className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:text-white"
                                    />
                                  </div>
                                )}
                                {post.imageUrl && (
                                  <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0">
                                    <img
                                      src={post.imageUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h3 
                                        className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors"
                                        data-testid={`text-post-title-${post.id}`}
                                      >
                                        {post.title}
                                      </h3>
                                      <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                                        {stripMarkdown(post.content).substring(0, 120)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge className={`text-xs border ${
                                      isAiSource(post.source)
                                        ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                                        : post.source === "rss"
                                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    }`}>
                                      {getSourceIcon(post.source)}
                                      <span className="ml-1">{getSourceLabel(post.source)}</span>
                                    </Badge>
                                    <span 
                                      className="text-xs text-gray-500"
                                      data-testid={`text-post-date-${post.id}`}
                                      title={new Date(post.createdAt).toLocaleString()}
                                    >
                                      {getRelativeTime(post.createdAt)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {getReadingTime(post.content).minutes} min
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-blue-600">
                                      <Eye className="w-3 h-3" />
                                      {(post.viewCount || 0).toLocaleString()}
                                    </span>
                                    {post.tags.slice(0, 2).map((tag) => (
                                      <Badge 
                                        key={tag} 
                                        className="text-xs font-normal bg-gray-100 text-gray-600 border border-gray-200"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                    {post.tags.length > 2 && (
                                      <span className="text-xs text-gray-500">
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
                                      className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                      data-testid={`button-delete-${post.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
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
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-6">
                    {searchQuery || sourceFilter !== "all" ? (
                      <Search className="w-10 h-10 text-gray-400" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {searchQuery || sourceFilter !== "all" ? "No posts found" : "No posts yet"}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
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
                className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200"
              >
                <p className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * POSTS_PER_PAGE) + 1} - {Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} posts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30"
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
                          variant="ghost"
                          size="icon"
                          className={`h-9 w-9 ${
                            currentPage === page 
                              ? "bg-gray-900 text-white hover:bg-gray-800" 
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                          onClick={() => setCurrentPage(page)}
                          data-testid={`button-page-${page}`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30"
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
          </>
          )}

          {activeTab === "topical" && siteId && (
            <div className="p-8">
              <TopicalAuthority siteId={siteId} />
            </div>
          )}

          {activeTab === "bulk" && siteId && (
            <div className="p-8">
              <BulkGeneration siteId={siteId} />
            </div>
          )}
        </main>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              {currentPost ? "Edit Post" : "Create New Post"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
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
              <Label htmlFor="title" className="text-sm font-medium text-gray-600">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter an engaging title..."
                className="text-lg bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:ring-gray-200"
                data-testid="input-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium text-gray-600">Content</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Start writing your post content..."
                minHeight="350px"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-gray-600">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="technology, news, tutorial"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:ring-gray-200"
                  data-testid="input-tags"
                />
                <p className="text-xs text-gray-400">Separate tags with commas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-600">Featured Image URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:ring-gray-200"
                  data-testid="input-image-url"
                />
                <p className="text-xs text-gray-400">Optional cover image for the post</p>
              </div>
            </div>
            {authors && authors.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="author" className="text-sm font-medium text-gray-600">Author</Label>
                <Select
                  value={formData.authorId}
                  onValueChange={(value) => setFormData({ ...formData, authorId: value })}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900" data-testid="select-author">
                    <SelectValue placeholder="Select an author" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="none" className="text-gray-900 focus:bg-gray-100">No author</SelectItem>
                    {authors.map((author) => (
                      <SelectItem key={author.id} value={author.id} className="text-gray-900 focus:bg-gray-100">
                        {author.name} {author.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">Select the post author</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="articleRole" className="text-sm font-medium text-gray-600">Article Role</Label>
              <Select
                value={formData.articleRole}
                onValueChange={(value) => setFormData({ ...formData, articleRole: value as ArticleRole })}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900" data-testid="select-article-role">
                  <SelectValue placeholder="Select article role" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 max-h-[300px]">
                  {ARTICLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="text-gray-900 focus:bg-gray-100">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-gray-500 ml-2 text-xs">{role.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Determines content structure and JSON-LD schema for SEO</p>
            </div>
          </motion.div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="ghost" onClick={closeEditor} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100" data-testid="button-cancel">
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
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-gray-200 text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-500 text-white hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-gray-200 text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete {selectedPosts.size} Post{selectedPosts.size > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Are you sure you want to delete {selectedPosts.size} selected post{selectedPosts.size > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200" data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-500 text-white hover:bg-red-600"
              data-testid="button-confirm-bulk-delete"
            >
              Delete {selectedPosts.size} Post{selectedPosts.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={csvImportOpen} onOpenChange={(open) => !open && closeCsvImport()}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-xl border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <FileSpreadsheet className="w-5 h-5" />
              Import Posts from CSV
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Upload a CSV file with your posts. Required columns: title, description. Optional: tags.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Download className="w-4 h-4" />
                <span>Need a template?</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={downloadCsvTemplate}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                data-testid="button-download-template"
              >
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file" className="text-gray-600">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileSelect}
                disabled={csvImporting}
                className="bg-white border-gray-200 text-gray-900 file:bg-gray-100 file:text-gray-700 file:border-0"
                data-testid="input-csv-file"
              />
              {csvContent && (
                <p className="text-sm text-gray-500">
                  File loaded: {csvContent.split('\n').length - 1} data row(s) detected
                </p>
              )}
            </div>

            {csvResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg ${
                  csvResult.imported > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {csvResult.imported > 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {csvResult.imported > 0 
                        ? `Successfully imported ${csvResult.imported} post${csvResult.imported > 1 ? 's' : ''}`
                        : "No posts imported"
                      }
                    </p>
                    {csvResult.skipped > 0 && (
                      <p className="text-sm text-gray-500">
                        {csvResult.skipped} row{csvResult.skipped > 1 ? 's' : ''} skipped
                      </p>
                    )}
                    {csvResult.errors.length > 0 && (
                      <div className="mt-2 text-sm space-y-1">
                        <p className="text-gray-500 font-medium">Issues:</p>
                        <ul className="list-disc list-inside text-gray-500">
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
              variant="ghost" 
              onClick={closeCsvImport}
              disabled={csvImporting}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
