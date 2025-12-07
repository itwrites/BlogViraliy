import { useState } from "react";
import { Menu, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useLocation } from "wouter";
import type { SiteMenuItem } from "@shared/schema";

type MenuActiveStyle = "underline" | "background" | "pill" | "bold";

interface MobileNavProps {
  tags: string[];
  menuItems?: SiteMenuItem[];
  isManualMode?: boolean;
  onTagClick: (tag: string) => void;
  onHomeClick: () => void;
  onMenuItemClick?: (item: SiteMenuItem) => void;
  siteTitle: string;
  currentTag?: string | null;
  currentGroupSlug?: string | null;
  menuActiveStyle?: MenuActiveStyle;
  showMenuIcons?: boolean;
  basePath?: string;
}

function getMobileMenuItemClasses(isActive: boolean, style: MenuActiveStyle) {
  const baseClasses = "text-left px-4 py-3 text-base font-medium uppercase tracking-wide transition-all duration-200 flex items-center gap-3";
  
  switch (style) {
    case "underline":
      return `${baseClasses} rounded-md ${
        isActive 
          ? 'border-l-4 border-primary text-primary bg-primary/5 pl-3' 
          : 'text-foreground/70 hover:text-primary hover:bg-muted'
      }`;
    case "background":
      return `${baseClasses} rounded-md ${
        isActive 
          ? 'bg-primary/10 text-primary' 
          : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
      }`;
    case "pill":
      return `${baseClasses} rounded-full ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'text-foreground/70 hover:text-primary hover:bg-muted'
      }`;
    case "bold":
      return `${baseClasses} rounded-md ${
        isActive 
          ? 'text-primary font-bold' 
          : 'text-foreground/70 hover:text-primary font-medium hover:bg-muted'
      }`;
    default:
      return baseClasses;
  }
}

export function MobileNav({ 
  tags, 
  menuItems = [],
  isManualMode = false,
  onTagClick, 
  onHomeClick,
  onMenuItemClick,
  siteTitle, 
  currentTag,
  currentGroupSlug,
  menuActiveStyle = "underline", 
  showMenuIcons = true,
  basePath = ""
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const handleTagClick = (tag: string) => {
    onTagClick(tag);
    setOpen(false);
  };

  const handleMenuItemClick = (item: SiteMenuItem) => {
    if (item.type === "url") {
      if (item.href?.startsWith("http")) {
        // External URLs - open in browser
        if (item.openInNewTab) {
          window.open(item.href, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = item.href;
        }
      } else {
        // Internal URLs - use router-relative path (no basePath prefix)
        setLocation(item.href || "/");
      }
    } else if (item.type === "tag_group" && item.groupSlug) {
      // Topic groups - router-relative path
      setLocation(`/topics/${item.groupSlug}`);
    }
    onMenuItemClick?.(item);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          data-testid="button-mobile-menu"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <div className="flex items-center justify-between mb-6">
          <SheetTitle className="text-lg font-semibold">{siteTitle}</SheetTitle>
          <SheetClose asChild>
            <Button 
              variant="ghost" 
              size="icon"
              data-testid="button-close-mobile-menu"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </Button>
          </SheetClose>
        </div>
        <nav className="flex flex-col gap-1" data-testid="nav-mobile">
          {isManualMode ? (
            menuItems.map((item) => {
              // For active state: compare against router-relative paths (without basePath)
              const isActive = item.type === "tag_group" 
                ? currentGroupSlug === item.groupSlug
                : Boolean(item.href && !item.href.startsWith("http") && location.startsWith(item.href));
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item)}
                  className={getMobileMenuItemClasses(isActive, menuActiveStyle)}
                  data-testid={`link-mobile-menu-${item.id}`}
                  data-active={isActive}
                >
                  <span className="flex items-center gap-2">
                    {item.label.toUpperCase()}
                    {item.type === "url" && item.openInNewTab && (
                      <ExternalLink className="h-4 w-4 opacity-50" />
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            tags.map((tag) => {
              const isActive = currentTag?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={getMobileMenuItemClasses(isActive, menuActiveStyle)}
                  data-testid={`link-mobile-tag-${tag}`}
                  data-active={isActive}
                >
                  {tag.toUpperCase()}
                </button>
              );
            })
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
