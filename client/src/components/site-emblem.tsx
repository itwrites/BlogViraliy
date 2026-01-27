import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface SiteEmblemProps {
  title?: string | null;
  favicon?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function SiteEmblem({
  title,
  favicon,
  className,
  imageClassName,
  fallbackClassName,
}: SiteEmblemProps) {
  const [hasError, setHasError] = useState(false);
  const initial = useMemo(() => {
    const cleanTitle = title?.trim();
    return cleanTitle?.[0]?.toUpperCase() || "?";
  }, [title]);

  const showImage = Boolean(favicon) && !hasError;

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground",
        className
      )}
      aria-label={title || "Site"}
      title={title || "Site"}
    >
      {showImage ? (
        <img
          src={favicon || ""}
          alt={title || "Site favicon"}
          className={cn("h-full w-full rounded-[inherit] object-cover", imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={cn("text-sm font-semibold", fallbackClassName)}>
          {initial}
        </span>
      )}
    </div>
  );
}
