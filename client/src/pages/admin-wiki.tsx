import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  ChevronRight, 
  Search, 
  FileText,
  Layers,
  Link2,
  Rss,
  Sparkles,
  Palette,
  Globe,
  BarChart3
} from "lucide-react";
import type { WikiData, WikiSection } from "@shared/admin-wiki";
import ReactMarkdown from "react-markdown";

const sectionIcons: Record<string, typeof BookOpen> = {
  overview: BookOpen,
  "multi-domain": Globe,
  "content-packs": Layers,
  "article-roles": FileText,
  "topical-authority": BarChart3,
  "rss-automation": Rss,
  "ai-generation": Sparkles,
  themes: Palette,
  "seo-features": Link2,
};

function TableOfContents({ 
  sections, 
  activeSection, 
  onSelect 
}: { 
  sections: WikiSection[]; 
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {sections.map((section) => {
        const Icon = sectionIcons[section.id] || FileText;
        const isActive = activeSection === section.id || 
          section.subsections?.some(s => activeSection === s.id);
        
        return (
          <div key={section.id}>
            <button
              onClick={() => onSelect(section.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover-elevate"
              }`}
              data-testid={`nav-${section.id}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
            {section.subsections && isActive && (
              <div className="ml-6 mt-1 space-y-1">
                {section.subsections.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelect(sub.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left ${
                      activeSection === sub.id
                        ? "bg-accent/50 text-accent-foreground"
                        : "text-muted-foreground hover-elevate"
                    }`}
                    data-testid={`nav-${sub.id}`}
                  >
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{sub.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SectionContent({ section }: { section: WikiSection }) {
  return (
    <div id={section.id} className="scroll-mt-4">
      <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{section.content}</ReactMarkdown>
      </div>
      {section.subsections && (
        <div className="mt-6 space-y-6">
          {section.subsections.map((sub) => (
            <div key={sub.id} id={sub.id} className="scroll-mt-4">
              <h3 className="text-lg font-medium mb-3">{sub.title}</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{sub.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminWikiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  const { data: wiki, isLoading } = useQuery<WikiData>({
    queryKey: ["/api/admin/wiki"],
  });

  const handleSectionSelect = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredSections = wiki?.sections.filter((section) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesSection = 
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query);
    const matchesSubsection = section.subsections?.some(
      sub => 
        sub.title.toLowerCase().includes(query) ||
        sub.content.toLowerCase().includes(query)
    );
    return matchesSection || matchesSubsection;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading documentation...</div>
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Documentation not available</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">{wiki.title}</h1>
              <p className="text-sm text-muted-foreground">{wiki.description}</p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Last updated: {wiki.lastUpdated}
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-wiki-search"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-3">
            <TableOfContents
              sections={filteredSections}
              activeSection={activeSection}
              onSelect={handleSectionSelect}
            />
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl">
            <div className="space-y-10">
              {filteredSections.map((section) => (
                <div key={section.id}>
                  <SectionContent section={section} />
                  <Separator className="mt-10" />
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
