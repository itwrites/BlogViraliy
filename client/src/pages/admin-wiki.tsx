import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  Server,
  Copy,
  Check
} from "lucide-react";
import type { WikiData, WikiSection } from "@shared/admin-wiki";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const sectionIcons: Record<string, typeof BookOpen> = {
  overview: BookOpen,
  "multi-domain": Globe,
  "reverse-proxy": Server,
  "content-packs": Layers,
  "article-roles": FileText,
  "topical-authority": BarChart3,
  "rss-automation": Rss,
  "ai-generation": Sparkles,
  themes: Palette,
  "seo-features": Link2,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      data-testid="button-copy-code"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

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
    <nav className="space-y-0.5">
      {sections.map((section) => {
        const Icon = sectionIcons[section.id] || FileText;
        const isActive = activeSection === section.id || 
          section.subsections?.some(s => activeSection === s.id);
        
        return (
          <div key={section.id}>
            <button
              onClick={() => onSelect(section.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left",
                isActive 
                  ? "bg-primary/10 text-primary border-l-2 border-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid={`nav-${section.id}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
            {section.subsections && isActive && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                {section.subsections.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelect(sub.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-all text-left",
                      activeSection === sub.id
                        ? "bg-primary/5 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    data-testid={`nav-${sub.id}`}
                  >
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
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

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold tracking-tight mb-4 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold tracking-tight mt-6 mb-3 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-medium mt-4 mb-2 text-foreground">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1.5 mb-4 text-muted-foreground">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1.5 mb-4 text-muted-foreground">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          const codeString = String(children).replace(/\n$/, "");
          
          if (isBlock) {
            const language = className?.replace("language-", "") || "";
            return (
              <div className="relative group my-4">
                {language && (
                  <div className="absolute top-0 left-0 px-3 py-1 text-xs font-mono text-muted-foreground bg-muted/50 rounded-tl-lg rounded-br-lg border-r border-b border-border">
                    {language}
                  </div>
                )}
                <CopyButton text={codeString} />
                <pre className="bg-muted/50 border border-border rounded-lg p-4 pt-8 overflow-x-auto">
                  <code className="text-sm font-mono text-foreground leading-relaxed">
                    {children}
                  </code>
                </pre>
              </div>
            );
          }
          
          return (
            <code className="px-1.5 py-0.5 bg-muted rounded-md text-sm font-mono text-foreground">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50 border-b border-border">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-muted/30 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-muted-foreground">
            {children}
          </td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-4 italic text-muted-foreground bg-muted/20 rounded-r-lg">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function SectionContent({ section }: { section: WikiSection }) {
  return (
    <div id={section.id} className="scroll-mt-8">
      <div className="flex items-center gap-3 mb-6">
        {(() => {
          const Icon = sectionIcons[section.id] || FileText;
          return <Icon className="h-6 w-6 text-primary" />;
        })()}
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{section.title}</h2>
      </div>
      <div className="pl-9">
        <MarkdownContent content={section.content} />
        
        {section.subsections && (
          <div className="mt-8 space-y-8">
            {section.subsections.map((sub) => (
              <div 
                key={sub.id} 
                id={sub.id} 
                className="scroll-mt-8 rounded-xl border border-border bg-card/50 p-6"
              >
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  {sub.title}
                </h3>
                <MarkdownContent content={sub.content} />
              </div>
            ))}
          </div>
        )}
      </div>
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
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading documentation...</span>
        </div>
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <div className="text-muted-foreground">Documentation not available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{wiki.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{wiki.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 font-normal">
              Updated {wiki.lastUpdated}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r bg-muted/20 flex flex-col shrink-0 hidden md:flex">
          <div className="p-4 border-b bg-card/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/80"
                data-testid="input-wiki-search"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <TableOfContents
                sections={filteredSections}
                activeSection={activeSection}
                onSelect={handleSectionSelect}
              />
            </div>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="space-y-16">
              {filteredSections.map((section, index) => (
                <div key={section.id}>
                  <SectionContent section={section} />
                  {index < filteredSections.length - 1 && (
                    <Separator className="mt-16" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
