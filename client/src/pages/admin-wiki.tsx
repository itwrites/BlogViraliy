import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
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
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors"
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
                  ? "bg-white/10 text-white border-l-2 border-blue-400" 
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
              data-testid={`nav-${section.id}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
            {section.subsections && isActive && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                {section.subsections.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelect(sub.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-all text-left",
                      activeSection === sub.id
                        ? "bg-white/5 text-white font-medium"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
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
          <h1 className="text-2xl font-bold tracking-tight mb-4 text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold tracking-tight mt-6 mb-3 text-white">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-medium mt-4 mb-2 text-white">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-white/60 leading-relaxed mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1.5 mb-4 text-white/60">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1.5 mb-4 text-white/60">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          const codeString = String(children).replace(/\n$/, "");
          
          if (isBlock) {
            const language = className?.replace("language-", "") || "";
            return (
              <div className="relative group my-4">
                {language && (
                  <div className="absolute top-0 left-0 px-3 py-1 text-xs font-mono text-white/50 bg-white/5 rounded-tl-lg rounded-br-lg border-r border-b border-white/10">
                    {language}
                  </div>
                )}
                <CopyButton text={codeString} />
                <pre className="bg-white/5 border border-white/10 rounded-lg p-4 pt-8 overflow-x-auto">
                  <code className="text-sm font-mono text-white/80 leading-relaxed">
                    {children}
                  </code>
                </pre>
              </div>
            );
          }
          
          return (
            <code className="px-1.5 py-0.5 bg-white/10 rounded-md text-sm font-mono text-white/80">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-white/5 border-b border-white/10">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-white/10">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-white/5 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left font-semibold text-white">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-white/60">
            {children}
          </td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500/30 pl-4 py-1 my-4 italic text-white/60 bg-white/5 rounded-r-lg">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
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
          return <Icon className="h-6 w-6 text-blue-400" />;
        })()}
        <h2 className="text-2xl font-bold tracking-tight text-white">{section.title}</h2>
      </div>
      <div className="pl-9">
        <MarkdownContent content={section.content} />
        
        {section.subsections && (
          <div className="mt-8 space-y-8">
            {section.subsections.map((sub) => (
              <div 
                key={sub.id} 
                id={sub.id} 
                className="scroll-mt-8 rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-blue-400" />
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
      <div className="flex items-center justify-center h-full bg-black">
        <div className="flex items-center gap-3 text-white/50">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <span>Loading documentation...</span>
        </div>
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-white/30 mx-auto mb-3" />
          <div className="text-white/50">Documentation not available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/3 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="border-b border-white/10 bg-black/80 backdrop-blur-2xl sticky top-0 z-10">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">{wiki.title}</h1>
                  <p className="text-sm text-white/50 mt-0.5">{wiki.description}</p>
                </div>
              </div>
              <Badge className="shrink-0 font-normal bg-white/10 text-white/70 border border-white/10">
                Updated {wiki.lastUpdated}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-white/10 bg-black/50 flex flex-col shrink-0 hidden md:flex">
            <div className="p-4 border-b border-white/10 bg-black/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50"
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

          <ScrollArea className="flex-1 bg-black/20">
            <div className="p-6 md:p-8 max-w-4xl mx-auto">
              <div className="space-y-16">
                {filteredSections.map((section, index) => (
                  <div key={section.id}>
                    <SectionContent section={section} />
                    {index < filteredSections.length - 1 && (
                      <Separator className="mt-16 bg-white/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
