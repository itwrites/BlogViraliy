import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useSiteContext } from "@/components/base-path-provider";
import { PaywallModal } from "@/components/paywall-modal";
import { OnboardingModal } from "@/components/onboarding-modal";
import { ArticleAllocationModal } from "@/components/ArticleAllocationModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { stripMarkdown } from "@/lib/strip-markdown";
import { RichTextEditor } from "@/components/rich-text-editor";
import { TopicalAuthority } from "@/components/topical-authority";
import { StrategyView } from "@/components/strategy-view";
import { BulkGeneration } from "@/components/bulk-generation";
import { SiteEmblem } from "@/components/site-emblem";
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
  Loader2,
  Users,
  Lock,
  Layers,
} from "lucide-react";

type ActiveTab = "posts" | "topical" | "bulk" | "ai" | "authors" | "calendar" | "strategy";
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
  { value: "general", label: "General", description: "Standard blog article" },
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
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logout, isOwner: authIsOwner, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, isOwner } = useSubscription();
  
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
  const [pillarFilter, setPillarFilter] = useState<string | null>(null);
  const [pillarFilterLabel, setPillarFilterLabel] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);
  const [aiTopicInput, setAiTopicInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("Full Access");
  const [csvResult, setCsvResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    totalErrors: number;
  } | null>(null);
  const [publishNowDialogOpen, setPublishNowDialogOpen] = useState(false);
  const [postToPublish, setPostToPublish] = useState<Post | null>(null);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationSites, setAllocationSites] = useState<{id: string; title: string}[]>([]);
  const [allocationQuota, setAllocationQuota] = useState(30);
  const [existingAllocation, setExistingAllocation] = useState<Record<string, number> | null>(null);
  const [generationCheckDone, setGenerationCheckDone] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    imageUrl: "",
    authorId: "" as string,
    articleRole: "general" as ArticleRole,
  });

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: site } = useQuery<Site>({
    queryKey: ["/api/editor/sites", siteId],
    enabled: !!siteId,
  });

  const { data: posts, isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "posts"],
    enabled: !!siteId,
  });
  
  // Fetch subscription data to know if user is paid (for loading message)
  const { data: subscriptionData } = useQuery<{
    status: string;
    plan: string | null;
    postsLimit: number;
  }>({
    queryKey: ["/bv_api/subscription"],
    queryFn: async () => {
      const res = await fetch("/bv_api/subscription", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
  });
  
  const isPaidUser = subscriptionData?.status === 'active' && subscriptionData?.plan;
  
  // Query generation status from dedicated endpoint (more reliable than checking flags)
  const { data: generationStatus } = useQuery<{
    isGenerating: boolean;
    articlesCreated: number;
    expectedCount: number;
    isPaidUser: boolean;
  }>({
    queryKey: ["/api/sites", siteId, "generation-status"],
    queryFn: async () => {
      const res = await fetch(`/bv_api/sites/${siteId}/generation-status`, { credentials: "include" });
      if (!res.ok) return { isGenerating: false, articlesCreated: 0, expectedCount: 0, isPaidUser: false };
      return res.json();
    },
    enabled: !!siteId,
    refetchInterval: 3000, // Poll every 3 seconds to check generation status
  });
  
  const isGeneratingInitialArticles = generationStatus?.isGenerating ?? false;
  const realArticleCount = generationStatus?.articlesCreated ?? posts?.filter(p => !p.isLocked)?.length ?? 0;
  const expectedArticleCount = generationStatus?.expectedCount ?? 4;

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const tabParam = params.get("tab") as ActiveTab | null;
    const pillarParam = params.get("pillarId");
    const topicParam = params.get("topic");

    if (tabParam && ["posts", "topical", "bulk", "ai", "authors", "calendar", "strategy"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    if (pillarParam) {
      setPillarFilter(pillarParam);
      setPillarFilterLabel(topicParam || null);
    } else {
      setPillarFilter(null);
      setPillarFilterLabel(null);
    }
  }, [location]);

  // Auto-refresh posts when articles are being generated
  useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "posts", "refresh"],
    queryFn: async () => {
      const res = await fetch(`/bv_api/editor/sites/${siteId}/posts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      queryClient.setQueryData(["/api/editor/sites", siteId, "posts"], data);
      return data;
    },
    enabled: !!siteId && isGeneratingInitialArticles,
    refetchInterval: isGeneratingInitialArticles ? 4000 : false,
  });
  
  // Also refresh site data to check when generation completes
  useQuery({
    queryKey: ["/api/editor/sites", siteId, "refresh"],
    queryFn: async () => {
      const res = await fetch(`/bv_api/editor/sites/${siteId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch site");
      const data = await res.json();
      queryClient.setQueryData([`/bv_api/editor/sites/${siteId}`], data);
      return data;
    },
    enabled: !!siteId && isGeneratingInitialArticles,
    refetchInterval: isGeneratingInitialArticles ? 4000 : false,
  });
  
  const isLoading = isLoadingPosts;
  
  // Login-based failsafe: Check if paid user needs first-payment generation
  useEffect(() => {
    if (generationCheckDone || !isPaidUser || !site?.isOnboarded) return;
    
    const checkGenerationNeeds = async () => {
      try {
        const res = await fetch("/api/check-generation-needs", { credentials: "include" });
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.needsGeneration) {
          if (data.needsAllocation && data.sites.length > 1) {
            setAllocationSites(data.sites);
            setAllocationQuota(data.totalQuota);
            setExistingAllocation(data.existingAllocation || null);
            setAllocationModalOpen(true);
            // Don't set generationCheckDone - allow re-check on next visit if modal is dismissed
            return;
          } else {
            const genRes = await fetch("/api/trigger-first-payment-generation", {
              method: "POST",
              credentials: "include",
            });
            if (genRes.ok) {
              queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
            }
          }
        }
        
        setGenerationCheckDone(true);
      } catch (error) {
        console.error("Failed to check generation needs:", error);
        setGenerationCheckDone(true);
      }
    };
    
    checkGenerationNeeds();
  }, [isPaidUser, site?.isOnboarded, generationCheckDone, siteId]);
  
  const handleAllocationComplete = async () => {
    setAllocationModalOpen(false);
    try {
      const res = await fetch("/api/trigger-first-payment-generation", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({
          title: "Content Generation Started",
          description: "Your articles are being created. This may take a few minutes.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId] });
      }
    } catch (error) {
      console.error("Failed to trigger generation:", error);
    }
  };

  const { data: authors } = useQuery<SiteAuthor[]>({
    queryKey: ["/api/sites", siteId, "authors"],
    enabled: !!siteId,
  });

  const { data: scheduledPosts } = useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "scheduled-posts"],
    queryFn: async () => {
      const res = await fetch(`/api/editor/sites/${siteId}/scheduled-posts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scheduled posts");
      return res.json();
    },
    enabled: !!siteId && activeTab === "calendar",
  });

  // Calendar helper functions
  const getCalendarDays = useCallback(() => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfWeek(endOfMonth(calendarMonth));
    const days: Date[] = [];
    let current = start;
    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [calendarMonth]);

  const getPostsForDate = useCallback((date: Date) => {
    if (!scheduledPosts) return [];
    return scheduledPosts.filter((post) => {
      if (!post.scheduledPublishDate) return false;
      return isSameDay(new Date(post.scheduledPublishDate), date);
    });
  }, [scheduledPosts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    
    const filtered = posts.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSource = sourceFilter === "all" 
        || (sourceFilter === "ai" && isAiSource(post.source))
        || post.source === sourceFilter;

      const matchesPillar = !pillarFilter || post.pillarId === pillarFilter;
      
      return matchesSearch && matchesSource && matchesPillar;
    });
    
    // Sort: unlocked articles first, locked articles at bottom
    return filtered.sort((a, b) => {
      if (a.isLocked === b.isLocked) return 0;
      return a.isLocked ? 1 : -1;
    });
  }, [posts, searchQuery, sourceFilter, pillarFilter]);
  
  // Separate unlocked and locked articles for grouped display
  // For paid users: COMPLETELY HIDE locked articles (they are fake placeholders)
  // For free users: Show unlocked articles normally, show locked at bottom with blur
  const unlockedPosts = useMemo(() => {
    // For paid users, filter OUT all locked posts entirely (they're fake)
    // For free users, only show non-locked posts in the main list
    const unlocked = filteredPosts.filter(p => !p.isLocked);
    return unlocked.slice(
      (currentPage - 1) * POSTS_PER_PAGE,
      Math.min(currentPage * POSTS_PER_PAGE, unlocked.length)
    );
  }, [filteredPosts, currentPage]);
  
  const lockedPosts = useMemo(() => {
    // Paid users should NEVER see locked posts - they are fake placeholders
    if (hasActiveSubscription) return [];
    // Free users see locked posts at the bottom with blur/paywall
    return filteredPosts.filter(p => p.isLocked);
  }, [filteredPosts, hasActiveSubscription]);

  // Pagination is based on real (non-locked) posts only
  const allUnlockedPosts = useMemo(() => {
    return filteredPosts.filter(p => !p.isLocked);
  }, [filteredPosts]);
  const totalPages = Math.ceil(allUnlockedPosts.length / POSTS_PER_PAGE);
  
  // Check if there are any posts to display (used for showing content vs empty state)
  const hasPostsToShow = allUnlockedPosts.length > 0 || lockedPosts.length > 0;

  const stats = useMemo(() => {
    if (!posts) return { total: 0, manual: 0, ai: 0, rss: 0, totalViews: 0 };
    // Only count real articles (exclude locked placeholder articles)
    const realPosts = posts.filter(p => !p.isLocked);
    return {
      total: realPosts.length,
      manual: realPosts.filter(p => p.source === "manual").length,
      ai: realPosts.filter(p => isAiSource(p.source)).length,
      rss: realPosts.filter(p => p.source === "rss").length,
      totalViews: realPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0),
    };
  }, [posts]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const showPaywall = (feature: string) => {
    if (isOwner && !hasActiveSubscription) {
      setPaywallFeature(feature);
      setPaywallOpen(true);
      return true;
    }
    return false;
  };

  const clearPillarFilter = () => {
    setPillarFilter(null);
    setPillarFilterLabel(null);
    setLocation(location.split("?")[0]);
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

  const handleAiGenerate = async () => {
    if (!aiTopicInput.trim()) {
      toast({ title: "Error", description: "Please enter a topic", variant: "destructive" });
      return;
    }
    
    setAiGenerating(true);
    try {
      const res = await apiRequest("POST", `/api/editor/sites/${siteId}/posts/generate-ai`, {
        topic: aiTopicInput.trim()
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (error.code === "BUSINESS_PROFILE_REQUIRED") {
          toast({ 
            title: "Business Profile Required", 
            description: "Please complete your business profile in Settings before generating AI content.", 
            variant: "destructive" 
          });
        } else if (error.code === "POST_LIMIT_EXCEEDED") {
          toast({ 
            title: "Article Limit Reached", 
            description: error.error || "You've reached your article limit. Upgrade to create more articles.", 
            variant: "destructive" 
          });
        } else {
          throw new Error(error.error || "Failed to generate article");
        }
        return;
      }
      
      const post = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      toast({ title: "Success", description: `AI article "${post.title}" created successfully!` });
      setNewPostModalOpen(false);
      setAiTopicInput("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate AI article", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
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
        toast({ title: "Success", description: "Article updated successfully" });
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
        toast({ title: "Success", description: "Article created successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      closeEditor();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save article", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      await apiRequest("DELETE", `/api/editor/posts/${postToDelete.id}`, undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      toast({ title: "Success", description: "Article deleted successfully" });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete article", variant: "destructive" });
    }
  };

  const handlePublishNow = async () => {
    if (!postToPublish) return;

    try {
      await apiRequest("PUT", `/api/editor/posts/${postToPublish.id}`, {
        status: "published",
        scheduledPublishDate: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId, "posts"] });
      toast({ title: "Published", description: "Article published successfully" });
      setPublishNowDialogOpen(false);
      setPostToPublish(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to publish article", variant: "destructive" });
    }
  };

  const openPublishNowDialog = (post: Post) => {
    setPostToPublish(post);
    setPublishNowDialogOpen(true);
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

  // Bulk selection only works on unlocked posts (current page)
  const allCurrentPageSelected = unlockedPosts.length > 0 && 
    unlockedPosts.every(p => selectedPosts.has(p.id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        unlockedPosts.forEach(p => newSet.delete(p.id));
        return newSet;
      });
    } else {
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        unlockedPosts.forEach(p => newSet.add(p.id));
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
        description: `${selectedPosts.size} article${selectedPosts.size > 1 ? 's' : ''} deleted` 
      });
      setBulkDeleteDialogOpen(false);
      exitBulkMode();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete articles", variant: "destructive" });
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
          description: `Successfully imported ${result.imported} article${result.imported > 1 ? 's' : ''}` 
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
"My First Article","This is the content of my first article.

You can use multiple lines in the description field when wrapped in quotes.

HTML or plain text are both supported.","tag1, tag2, tag3","/my-first-post","https://example.com/image1.jpg"
"Another Article","Another great article with interesting content.","news, updates","another-post",""
"Article Without Slug","The slug will be auto-generated from the title if left empty.","example","",""`;
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
  
  const getStatusBadge = (status: string) => {
    if (status === "published") {
      return (
        <Badge className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Globe className="w-3 h-3 mr-1" />
          Published
        </Badge>
      );
    }
    return (
      <Badge className="text-xs bg-muted/60 text-muted-foreground border border-border">
        <FileText className="w-3 h-3 mr-1" />
        Draft
      </Badge>
    );
  };

  const hasSiteContext = !!siteContext;

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

      <div className="relative z-10 flex">
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border shadow-[2px_0_16px_rgba(15,23,42,0.08)] z-40 flex flex-col"
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/blog-autopilot-mark.svg" 
                alt="Blog Autopilot" 
                className="w-10 h-10"
              />
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground" style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Roboto, Helvetica, Arial' }}>
                Blog Autopilot
              </span>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            <div className="space-y-1 mb-4">
              <button
                onClick={() => setActiveTab("posts")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === "posts" ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                data-testid="nav-posts"
              >
                <FileText className="w-4 h-4" />
                <span className="flex-1 text-left">Articles</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  activeTab === "posts" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {stats.total}
                </span>
              </button>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    activeTab === "calendar" ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-calendar"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="flex-1 text-left">Calendar</span>
                  {scheduledPosts && scheduledPosts.length > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      activeTab === "calendar" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {scheduledPosts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("strategy")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    activeTab === "strategy" ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-strategy"
                >
                  <Layers className="w-4 h-4" />
                  <span className="flex-1 text-left">Content Map</span>
                </button>
                {user?.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("topical")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                      activeTab === "topical" ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-topical"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="flex-1 text-left">Topical Authority</span>
                </button>
              )}
              {user?.role === "admin" && (
                <button
                  onClick={() => setActiveTab("bulk")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    activeTab === "bulk" ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-bulk"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="flex-1 text-left">Bulk Generation</span>
                </button>
              )}
              {user?.role === "admin" && (
                <button
                  onClick={() => setLocation(`/admin/sites/${siteId}/analytics`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground"
                  data-testid="nav-analytics"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="flex-1 text-left">Analytics</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl p-3 bg-white card-elevate">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{stats.total}</span>
                <span className="text-xs text-muted-foreground/70">articles</span>
              </div>
            </div>

          </div>

          <div className="p-4 border-t border-border space-y-3 bg-muted/30">
            {/* macOS-style generation progress indicator - above site name */}
            <AnimatePresence>
              {isGeneratingInitialArticles && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  data-testid="sidebar-generation-indicator"
                >
                  <div 
                    className="rounded-xl bg-white p-3"
                    style={{ 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Crafting articles...</span>
                      <span className="text-[10px] text-gray-500 tabular-nums font-medium">
                        {realArticleCount} of {expectedArticleCount}
                      </span>
                    </div>
                    {/* macOS-style progress bar */}
                    <div className="relative w-full h-[5px] bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ 
                          background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((realArticleCount / expectedArticleCount) * 100, 100)}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      {/* Subtle shimmer */}
                      <motion.div
                        className="absolute inset-y-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                          width: '40%'
                        }}
                        animate={{ x: ['-100%', '300%'] }}
                        transition={{ 
                          duration: 1.8, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          repeatDelay: 0.3
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white card-elevate">
              <SiteEmblem title={site?.title} favicon={site?.favicon} />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold truncate text-foreground" data-testid="text-site-title">
                  {site?.title || "Loading..."}
                </h1>
                <p className="text-xs text-muted-foreground/80 truncate">{site?.domain}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                    data-testid="button-site-settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => setLocation(`/admin/sites/${siteId}/settings`)}
                    data-testid="menu-blog-settings"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Blog Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/admin")}
                    data-testid="menu-plan-center"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Plan Center
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.aside>

        <main className="flex-1 ml-72 bg-background">
          {activeTab === "posts" && (
            <>
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-xl"
          >
            <div className="px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                      data-testid="input-search"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {pillarFilterLabel && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs text-muted-foreground w-fit">
                      <span>Topic: {pillarFilterLabel}</span>
                      <button
                        onClick={clearPillarFilter}
                        className="text-muted-foreground/70 hover:text-foreground transition-colors"
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {bulkMode ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={exitBulkMode}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
                        <button
                          onClick={() => setViewMode("list")}
                          className={`p-1.5 rounded transition-colors ${
                            viewMode === "list" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                          data-testid="button-view-list"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`p-1.5 rounded transition-colors ${
                            viewMode === "grid" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        data-testid="button-bulk-mode"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Select
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (showPaywall("Create New Articles")) return;
                          setNewPostModalOpen(true);
                        }}
                        data-testid="button-new-post"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Article
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.header>

          <div className="p-8">
            {bulkMode && unlockedPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-white card-elevate"
              >
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={toggleSelectAll}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-white"
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-muted-foreground/80">
                  {allCurrentPageSelected 
                    ? `All ${unlockedPosts.length} articles on this page selected`
                    : `Select all ${unlockedPosts.length} articles on this page`
                  }
                </span>
                {selectedPosts.size > 0 && (
                  <Badge className="bg-muted text-muted-foreground border border-border">
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
                    ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" 
                    : "space-y-4"
                  }
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`bg-white animate-pulse rounded-xl card-elevate ${
                        viewMode === "grid" ? "h-48" : "h-24"
                      }`}
                    />
                  ))}
                </motion.div>
              ) : hasPostsToShow ? (
                <div className="space-y-8">
                  {/* Unlocked Articles */}
                  {unlockedPosts.length > 0 && (
                    <motion.div
                      key="unlocked-posts"
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className={viewMode === "grid" 
                        ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" 
                        : "space-y-4"
                      }
                    >
                      <AnimatePresence>
                        {unlockedPosts.map((post) => (
                          <motion.div
                            key={post.id}
                            variants={cardVariants}
                            layout
                            data-testid={`card-post-${post.id}`}
                          >
                            {viewMode === "grid" ? (
                              <div
                                className={`group relative rounded-xl overflow-hidden bg-white card-elevate cursor-pointer ${
                                  bulkMode && selectedPosts.has(post.id) ? "ring-2 ring-primary" : ""
                                }`}
                                onClick={() => bulkMode ? togglePostSelection(post.id) : openEditor(post)}
                              >
                                {post.imageUrl ? (
                                  <div className="aspect-video relative overflow-hidden">
                                    <img
                                      src={post.imageUrl}
                                      alt={post.title}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                                  <div className="aspect-video relative bg-muted/50 flex items-center justify-center">
                                    <Image className="w-12 h-12 text-muted-foreground/40" />
                                    {bulkMode && (
                                      <div className="absolute top-2 left-2">
                                        <Checkbox
                                          checked={selectedPosts.has(post.id)}
                                          className="border-white/70 data-[state=checked]:bg-white data-[state=checked]:text-black"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="p-5">
                                  <h3 
                                    className="text-lg font-semibold text-foreground line-clamp-2 mb-2 transition-colors group-hover:text-primary"
                                    data-testid={`text-post-title-${post.id}`}
                                  >
                                    {post.title}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(post.status)}
                                    <span className="text-[11px] text-muted-foreground/70">
                                      {getRelativeTime(post.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`group relative rounded-xl overflow-hidden bg-white card-elevate cursor-pointer ${
                                  bulkMode && selectedPosts.has(post.id) ? "ring-2 ring-primary" : ""
                                }`}
                                onClick={() => bulkMode ? togglePostSelection(post.id) : openEditor(post)}
                              >
                                <div className="p-5">
                                  <div className="flex items-start gap-4">
                                    {bulkMode && (
                                      <div className="pt-1">
                                        <Checkbox
                                          checked={selectedPosts.has(post.id)}
                                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-white"
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
                                        className={`text-lg font-semibold text-foreground line-clamp-1 transition-colors ${!post.isLocked ? "group-hover:text-primary" : ""}`}
                                        data-testid={`text-post-title-${post.id}`}
                                      >
                                        {post.title}
                                      </h3>
                                      <p className="text-[13px] text-muted-foreground/80 line-clamp-1 mt-1">
                                        {stripMarkdown(post.content).substring(0, 120)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {getStatusBadge(post.status)}
                                    <span 
                                      className="text-[11px] text-muted-foreground/70"
                                      data-testid={`text-post-date-${post.id}`}
                                      title={new Date(post.createdAt).toLocaleString()}
                                    >
                                      {getRelativeTime(post.createdAt)}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground/70">
                                      {getReadingTime(post.content).minutes} min read
                                    </span>
                                    {post.tags.slice(0, 2).map((tag) => (
                                      <Badge 
                                        key={tag} 
                                        className="text-[11px] font-normal bg-muted text-muted-foreground border border-border"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                {!bulkMode && !post.isLocked && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {post.status === "draft" && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPublishNowDialog(post);
                                        }}
                                        className="text-muted-foreground hover:text-primary"
                                        data-testid={`button-publish-${post.id}`}
                                        title="Publish now"
                                      >
                                        <Globe className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditor(post);
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
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
                                      className="text-muted-foreground hover:text-foreground"
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
                )}

                  {/* Locked Articles Section - At BOTTOM */}
                  {lockedPosts.length > 0 && (
                    <div className="relative">
                      {/* Locked Articles List (heavily blurred) */}
                      <div className={`${viewMode === "grid" 
                        ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" 
                        : "space-y-4"
                      } opacity-40 blur-sm select-none pointer-events-none`}>
                        {lockedPosts.map((post) => (
                          <div
                            key={post.id}
                            data-testid={`card-post-locked-${post.id}`}
                          >
                            {viewMode === "grid" ? (
                              <div className="relative rounded-xl overflow-hidden bg-white card-elevate">
                                {post.imageUrl ? (
                                  <div className="aspect-video relative overflow-hidden">
                                    <img
                                      src={post.imageUrl}
                                      alt={post.title}
                                      className="w-full h-full object-cover grayscale"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                  </div>
                                ) : (
                                  <div className="aspect-video relative bg-muted/50 flex items-center justify-center">
                                    <Image className="w-12 h-12 text-muted-foreground/40" />
                                  </div>
                                )}
                                <div className="p-5">
                                  <h3 className="text-lg font-semibold text-foreground line-clamp-2 mb-2">
                                    {post.title}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(post.status)}
                                    <span className="text-[11px] text-muted-foreground/70">
                                      {getRelativeTime(post.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="relative rounded-xl overflow-hidden bg-white card-elevate">
                                <div className="p-5">
                                  <div className="flex items-start gap-4">
                                    {post.imageUrl && (
                                      <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0">
                                        <img
                                          src={post.imageUrl}
                                          alt=""
                                          className="w-full h-full object-cover grayscale"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                                        {post.title}
                                      </h3>
                                      <p className="text-[13px] text-muted-foreground/80 line-clamp-1 mt-1">
                                        {stripMarkdown(post.content).substring(0, 120)}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {getStatusBadge(post.status)}
                                        <span className="text-[11px] text-muted-foreground/70">
                                          {getRelativeTime(post.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Centered Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div 
                          className="flex flex-col items-center gap-4 pointer-events-auto cursor-pointer"
                          onClick={() => showPaywall("locked articles")}
                          data-testid="banner-upgrade-unlock"
                        >
                          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                            <Lock className="w-10 h-10 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium text-center">
                            Subscribe to unlock further articles
                          </p>
                          <Button
                            className="rounded-full px-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              showPaywall("locked articles");
                            }}
                          >
                            Subscribe now! <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-20"
                >
                  {isGeneratingInitialArticles ? (
                    <>
                      {/* macOS-style loading screen */}
                      <div className="flex flex-col items-center justify-center min-h-[300px]">
                        <h3 
                          className="text-2xl font-light mb-3 text-foreground tracking-tight"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
                        >
                          {isPaidUser ? "Crafting Your Monthly Articles" : "Creating Your First Articles"}
                        </h3>
                        <p 
                          className="text-muted-foreground/70 max-w-sm mx-auto mb-8 text-center"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
                        >
                          {isPaidUser ? (
                            <>
                              We're generating all your articles for the month based on your business profile.
                              <br />
                              <span className="text-muted-foreground/50">This may take a few minutes.</span>
                            </>
                          ) : (
                            <>
                              We're generating personalized articles based on your business profile.
                              <br />
                              <span className="text-muted-foreground/50">This may take a few minutes the first time.</span>
                            </>
                          )}
                        </p>
                        {/* macOS-style progress bar */}
                        <div className="w-64 h-1 bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary/60 rounded-full"
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity, 
                              ease: "easeInOut"
                            }}
                            style={{ width: "40%" }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground/50 mt-4">
                          {isPaidUser 
                            ? `${realArticleCount} articles created so far...` 
                            : `${realArticleCount} of 2 articles created`
                          }
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-6">
                        {searchQuery || sourceFilter !== "all" ? (
                          <Search className="w-10 h-10 text-muted-foreground/60" />
                        ) : (
                          <Sparkles className="w-10 h-10 text-muted-foreground/60" />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">
                        {searchQuery || sourceFilter !== "all" ? "No articles found" : "No articles yet"}
                      </h3>
                      <p className="text-muted-foreground/80 max-w-md mx-auto mb-6">
                        {searchQuery
                          ? "Try adjusting your search terms or filters"
                          : sourceFilter !== "all"
                          ? `No ${sourceFilter === "ai" ? "AI generated" : sourceFilter === "rss" ? "RSS imported" : "manual"} articles found`
                          : "Create your first article to get started with your content"}
                      </p>
                      {!searchQuery && sourceFilter === "all" && (
                        <Button 
                          onClick={() => openEditor()} 
                          size="lg"
                          className="gap-2"
                          data-testid="button-create-first"
                        >
                          <Plus className="w-5 h-5" />
                          Create Your First Article
                        </Button>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between mt-8 pt-6 border-t border-border"
              >
                <p className="text-sm text-muted-foreground/80">
                  Showing {((currentPage - 1) * POSTS_PER_PAGE) + 1} - {Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} articles
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
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
                              ? "bg-primary text-white hover:bg-[hsl(var(--primary-hover))]" 
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                    className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
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

          {activeTab === "strategy" && siteId && (
            <StrategyView siteId={siteId} />
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

          {activeTab === "calendar" && siteId && (
            <div className="p-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[22px] font-semibold text-foreground">Content Calendar</h2>
                    <p className="text-muted-foreground/80 text-sm mt-1">View and manage your scheduled articles</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex-1 bg-white rounded-2xl overflow-hidden card-elevate">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <h3 className="text-lg font-semibold text-foreground">
                        {format(calendarMonth, "MMMM yyyy")}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-border">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div
                          key={day}
                          className="py-2 text-center text-xs font-medium text-muted-foreground/70 uppercase tracking-wider"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {getCalendarDays().map((date, index) => {
                        const postsForDay = getPostsForDate(date);
                        const isCurrentMonth = isSameMonth(date, calendarMonth);
                        const isSelected = selectedDate && isSameDay(date, selectedDate);
                        const isTodayDate = isToday(date);

                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedDate(date)}
                            className={`relative p-2 min-h-[80px] border-b border-r border-border text-left transition-colors ${
                              !isCurrentMonth ? "bg-muted/30" : "bg-white hover:bg-muted/40"
                            } ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
                            data-testid={`calendar-day-${format(date, "yyyy-MM-dd")}`}
                          >
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                                isTodayDate
                                  ? "bg-primary text-white font-semibold"
                                  : isCurrentMonth
                                  ? "text-foreground"
                                  : "text-muted-foreground/60"
                              }`}
                            >
                              {format(date, "d")}
                            </span>
                            {postsForDay.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {postsForDay.slice(0, 3).map((post) => (
                                  <div
                                    key={post.id}
                                    className={`text-xs px-1.5 py-0.5 rounded truncate ${
                                      post.status === "published"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                    title={post.title}
                                  >
                                    {post.title.substring(0, 15)}{post.title.length > 15 ? "..." : ""}
                                  </div>
                                ))}
                                {postsForDay.length > 3 && (
                                  <div className="text-xs text-muted-foreground/70 px-1.5">
                                    +{postsForDay.length - 3} more
                                  </div>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedDate && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="w-80 bg-white rounded-2xl overflow-hidden card-elevate"
                      >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {format(selectedDate, "EEEE")}
                            </h4>
                            <p className="text-sm text-muted-foreground/80">
                              {format(selectedDate, "MMMM d, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedDate(null)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted"
                            data-testid="button-close-day-panel"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                          {getPostsForDate(selectedDate).length > 0 ? (
                            getPostsForDate(selectedDate).map((post) => (
                              <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl border border-border hover:shadow-sm transition-all cursor-pointer hover:bg-muted/30"
                                onClick={() => openEditor(post)}
                                data-testid={`scheduled-post-${post.id}`}
                              >
                                <h5 className="font-medium text-foreground text-sm line-clamp-2">
                                  {post.title}
                                </h5>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    className={`text-xs ${
                                      post.status === "published"
                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                        : "bg-amber-100 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    {post.status === "published" ? "Published" : "Draft"}
                                  </Badge>
                                  {post.scheduledPublishDate && (
                                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(post.scheduledPublishDate), "h:mm a")}
                                    </span>
                                  )}
                                </div>
                                {post.imageUrl && (
                                  <img
                                    src={post.imageUrl}
                                    alt=""
                                    className="w-full h-20 object-cover rounded-lg mt-2"
                                  />
                                )}
                              </motion.div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground/80">No scheduled articles</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">
                                Articles with scheduled dates will appear here
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {!scheduledPosts || scheduledPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl p-8 text-center card-elevate"
                  >
                    <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Scheduled Articles</h3>
                    <p className="text-muted-foreground/80 text-sm max-w-md mx-auto">
                      When you schedule articles for future publication, they will appear on this calendar.
                      Set a scheduled publish date on any draft article to see it here.
                    </p>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-2xl p-4 card-elevate">
                    <h3 className="font-semibold text-foreground mb-3">Upcoming Scheduled</h3>
                    <div className="space-y-2">
                      {scheduledPosts.slice(0, 5).map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => {
                            if (post.scheduledPublishDate) {
                              setSelectedDate(new Date(post.scheduledPublishDate));
                              setCalendarMonth(new Date(post.scheduledPublishDate));
                            }
                          }}
                          data-testid={`upcoming-post-${post.id}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              post.status === "published" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                            {post.scheduledPublishDate && (
                              <p className="text-xs text-muted-foreground/70">
                                {format(new Date(post.scheduledPublishDate), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={`text-xs ${
                              post.status === "published"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {post.status === "published" ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={newPostModalOpen} onOpenChange={(open) => { if (!aiGenerating) setNewPostModalOpen(open); }}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">Create New Article</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Choose how you'd like to create your article
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button
              variant="ghost"
              onClick={() => {
                setNewPostModalOpen(false);
                openEditor();
              }}
              className="w-full h-auto flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/40 transition-all duration-200 text-left justify-start"
              data-testid="button-create-manual"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PenLine className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Write by Hand</h3>
                <p className="text-sm text-muted-foreground/80">Create an article manually with full control</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/70" />
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground/70">or</span>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-border space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Generate with AI</h3>
                  <p className="text-sm text-muted-foreground/80">Enter a topic and let AI write it</p>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Enter topic (e.g., 'best hiking trails in Colorado')"
                  value={aiTopicInput}
                  onChange={(e) => setAiTopicInput(e.target.value)}
                  disabled={aiGenerating}
                  className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  data-testid="input-ai-topic"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiTopicInput.trim() && !aiGenerating) {
                      handleAiGenerate();
                    }
                  }}
                />
                <Button
                  onClick={handleAiGenerate}
                  disabled={!aiTopicInput.trim() || aiGenerating}
                  className="w-full"
                  data-testid="button-generate-ai"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Article
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {currentPost ? "Edit Article" : "Create New Article"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {currentPost ? "Update your article content and settings" : "Write and publish a new article for your site"}
            </DialogDescription>
          </DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-muted-foreground/80">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter an engaging title..."
                className="text-lg bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                data-testid="input-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium text-muted-foreground/80">Content</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Start writing your post content..."
                minHeight="350px"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-muted-foreground/80">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="technology, news, tutorial"
                  className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  data-testid="input-tags"
                />
                <p className="text-xs text-muted-foreground/60">Separate tags with commas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium text-muted-foreground/80">Featured Image URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted-foreground/60">Optional cover image for the post</p>
              </div>
            </div>
            {authors && authors.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="author" className="text-sm font-medium text-muted-foreground/80">Author</Label>
                <Select
                  value={formData.authorId}
                  onValueChange={(value) => setFormData({ ...formData, authorId: value })}
                >
                  <SelectTrigger className="bg-white border-border text-foreground" data-testid="select-author">
                    <SelectValue placeholder="Select an author" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border">
                    <SelectItem value="none" className="text-foreground focus:bg-muted">No author</SelectItem>
                    {authors.map((author) => (
                      <SelectItem key={author.id} value={author.id} className="text-foreground focus:bg-muted">
                        {author.name} {author.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground/60">Select the post author</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="articleRole" className="text-sm font-medium text-muted-foreground/80">Article Role</Label>
              <Select
                value={formData.articleRole}
                onValueChange={(value) => setFormData({ ...formData, articleRole: value as ArticleRole })}
              >
                <SelectTrigger className="bg-white border-border text-foreground" data-testid="select-article-role">
                  <SelectValue placeholder="Select article role" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border max-h-[300px]">
                  {ARTICLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="text-foreground focus:bg-muted">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-muted-foreground/70 ml-2 text-xs">{role.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground/60">Determines content structure and JSON-LD schema for SEO</p>
            </div>
          </motion.div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={closeEditor} className="text-muted-foreground hover:text-foreground hover:bg-muted" data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" data-testid="button-save">
              {currentPost ? (
                <>
                  <Edit className="w-4 h-4" />
                  Update Article
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Article
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Article</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/70" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
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
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete {selectedPosts.size} Article{selectedPosts.size > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              Are you sure you want to delete {selectedPosts.size} selected article{selectedPosts.size > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/70" data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-500 text-white hover:bg-red-600"
              data-testid="button-confirm-bulk-delete"
            >
              Delete {selectedPosts.size} Article{selectedPosts.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishNowDialogOpen} onOpenChange={setPublishNowDialogOpen}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Publish Now?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              Our system schedules articles strategically to maximize SEO impact. Publishing immediately may reduce search engine visibility.
              <br /><br />
              Are you sure you want to publish "{postToPublish?.title}" now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/70" data-testid="button-cancel-publish">
              Keep Schedule
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePublishNow} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-confirm-publish"
            >
              Publish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={csvImportOpen} onOpenChange={(open) => !open && closeCsvImport()}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-xl border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="w-5 h-5" />
              Import Articles from CSV
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Upload a CSV file with your articles. Required columns: title, description. Optional: tags.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <Download className="w-4 h-4" />
                <span>Need a template?</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={downloadCsvTemplate}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
                data-testid="button-download-template"
              >
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file" className="text-muted-foreground/80">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileSelect}
                disabled={csvImporting}
                className="bg-white border-border text-foreground file:bg-muted file:text-foreground file:border-0"
                data-testid="input-csv-file"
              />
              {csvContent && (
                <p className="text-sm text-muted-foreground/80">
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
                    <p className="font-medium text-foreground">
                      {csvResult.imported > 0 
                        ? `Successfully imported ${csvResult.imported} article${csvResult.imported > 1 ? 's' : ''}`
                        : "No articles imported"
                      }
                    </p>
                    {csvResult.skipped > 0 && (
                      <p className="text-sm text-muted-foreground/80">
                        {csvResult.skipped} row{csvResult.skipped > 1 ? 's' : ''} skipped
                      </p>
                    )}
                    {csvResult.errors.length > 0 && (
                      <div className="mt-2 text-sm space-y-1">
                        <p className="text-muted-foreground/80 font-medium">Issues:</p>
                        <ul className="list-disc list-inside text-muted-foreground/80">
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
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
                    Import Articles
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaywallModal 
        open={paywallOpen} 
        onOpenChange={setPaywallOpen}
        feature={paywallFeature}
      />

      <ArticleAllocationModal
        open={allocationModalOpen}
        onOpenChange={setAllocationModalOpen}
        sites={allocationSites}
        totalQuota={allocationQuota}
        existingAllocation={existingAllocation}
        onAllocationComplete={handleAllocationComplete}
      />

      {site && !site.isOnboarded && siteId && (
        <OnboardingModal
          open={!site.isOnboarded}
          onOpenChange={() => {}}
          siteId={siteId}
          siteName={site.title}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/editor/sites", siteId] });
          }}
        />
      )}

    </div>
  );
}
