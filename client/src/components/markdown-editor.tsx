import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Quote, 
  Code,
  Eye,
  Edit
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Write your content in markdown...",
  minHeight = "400px"
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const insertMarkdown = (prefix: string, suffix: string = "", defaultText: string = "") => {
    const textarea = document.querySelector('[data-testid="textarea-markdown-content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || defaultText;
    
    const newValue = 
      value.substring(0, start) + 
      prefix + textToInsert + suffix + 
      value.substring(end);
    
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText 
        ? start + prefix.length + selectedText.length + suffix.length
        : start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown("**", "**", "bold text"), title: "Bold (Ctrl+B)" },
    { icon: Italic, action: () => insertMarkdown("*", "*", "italic text"), title: "Italic (Ctrl+I)" },
    { icon: Heading1, action: () => insertMarkdown("# ", "", "Heading 1"), title: "Heading 1" },
    { icon: Heading2, action: () => insertMarkdown("## ", "", "Heading 2"), title: "Heading 2" },
    { icon: List, action: () => insertMarkdown("- ", "", "List item"), title: "Bullet List" },
    { icon: ListOrdered, action: () => insertMarkdown("1. ", "", "List item"), title: "Numbered List" },
    { icon: Quote, action: () => insertMarkdown("> ", "", "Quote"), title: "Blockquote" },
    { icon: Code, action: () => insertMarkdown("`", "`", "code"), title: "Inline Code" },
    { icon: Link, action: () => insertMarkdown("[", "](url)", "link text"), title: "Link" },
    { icon: Image, action: () => insertMarkdown("![", "](image-url)", "alt text"), title: "Image" },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") {
        e.preventDefault();
        insertMarkdown("**", "**", "bold text");
      } else if (e.key === "i") {
        e.preventDefault();
        insertMarkdown("*", "*", "italic text");
      }
    }
  };

  return (
    <div className="border rounded-md bg-background">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-1">
            {toolbarButtons.map((btn, index) => (
              <Button
                key={index}
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={btn.action}
                title={btn.title}
                data-testid={`button-markdown-${btn.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <TabsList className="h-8">
            <TabsTrigger value="write" className="h-7 text-xs gap-1" data-testid="tab-markdown-write">
              <Edit className="h-3 w-3" />
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-7 text-xs gap-1" data-testid="tab-markdown-preview">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="write" className="m-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            className="border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm"
            style={{ minHeight }}
            data-testid="textarea-markdown-content"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-auto"
            style={{ minHeight }}
            data-testid="div-markdown-preview"
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview yet...</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
