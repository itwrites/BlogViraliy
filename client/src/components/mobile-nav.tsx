import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";

interface MobileNavProps {
  tags: string[];
  onTagClick: (tag: string) => void;
  siteTitle: string;
}

export function MobileNav({ tags, onTagClick, siteTitle }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const handleTagClick = (tag: string) => {
    onTagClick(tag);
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
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className="text-left px-3 py-3 rounded-md hover-elevate text-base transition-colors"
              data-testid={`link-mobile-tag-${tag}`}
            >
              {tag}
            </button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
