import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

interface TopBannerProps {
  message: string;
  backgroundColor: string;
  textColor: string;
  link?: string;
  dismissible?: boolean;
  siteId: string;
}

export function TopBanner({
  message,
  backgroundColor,
  textColor,
  link,
  dismissible = true,
  siteId,
}: TopBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const storageKey = `topBanner_dismissed_${siteId}`;

  useEffect(() => {
    if (dismissible) {
      const dismissed = localStorage.getItem(storageKey);
      if (dismissed) {
        setIsVisible(false);
      }
    }
  }, [dismissible, storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (dismissible) {
      localStorage.setItem(storageKey, "true");
    }
  };

  if (!message) return null;

  const content = (
    <span className="flex-1 text-center text-sm font-medium">
      {message}
    </span>
  );

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={prefersReducedMotion ? {} : { duration: 0.3 }}
          className="relative z-[60] px-4 py-2.5"
          style={{ backgroundColor, color: textColor }}
          data-testid="banner-top"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
            {link ? (
              <a
                href={link}
                className="flex-1 text-center text-sm font-medium hover:underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-banner"
              >
                {message}
              </a>
            ) : (
              content
            )}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss banner"
                data-testid="button-dismiss-banner"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
