import { motion, useReducedMotion } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import type { Site } from "@shared/schema";

interface PublicHeaderProps {
  site: Site;
  topTags: string[];
  onTagClick: (tag: string) => void;
  onLogoClick: () => void;
  templateClasses: {
    contentWidth: string;
    logoSize: { style: { width: number; height: number } };
    isHeaderSticky: boolean;
    maxNavItems: number;
    hideLogoText?: boolean;
  };
  variant?: "default" | "compact";
}

export function PublicHeader({ 
  site, 
  topTags, 
  onTagClick, 
  onLogoClick, 
  templateClasses,
  variant = "default"
}: PublicHeaderProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: -8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
  };

  const logoAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  const headerAnimation = prefersReducedMotion 
    ? {} 
    : { 
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: "easeOut" }
      };

  const hasTags = topTags && topTags.length > 0;

  return (
    <motion.header 
      {...headerAnimation}
      className={`${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''} border-b bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80`}
    >
      <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6`}>
        <div className={`flex items-center justify-between gap-4 ${variant === "compact" ? "h-14" : "py-4"}`}>
          <motion.div 
            className="flex items-center gap-3 sm:gap-4"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? false : "visible"}
            variants={containerAnimation}
          >
            {hasTags && (
              <MobileNav 
                tags={topTags} 
                onTagClick={onTagClick} 
                siteTitle={site.title} 
              />
            )}
            {site.logoUrl && (
              <motion.img
                variants={logoAnimation}
                src={site.logoUrl}
                alt={`${site.title} logo`}
                style={templateClasses.logoSize.style}
                className="object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onLogoClick}
                data-testid="img-site-logo"
              />
            )}
            {(!templateClasses.hideLogoText || !site.logoUrl) && (
              <motion.h1 
                variants={itemAnimation}
                className="text-xl sm:text-2xl font-semibold cursor-pointer hover:opacity-80 transition-opacity" 
                style={{ fontFamily: "var(--public-heading-font)" }}
                onClick={onLogoClick}
                data-testid="text-site-title"
              >
                {site.title}
              </motion.h1>
            )}
          </motion.div>

          {hasTags && (
            <motion.nav 
              className="hidden md:flex items-center"
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? false : "visible"}
              variants={containerAnimation}
              data-testid="nav-main"
            >
              <div className="flex items-center gap-1">
                {topTags.slice(0, templateClasses.maxNavItems).map((tag) => (
                  <motion.button
                    key={tag}
                    variants={itemAnimation}
                    onClick={() => onTagClick(tag)}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all duration-200 whitespace-nowrap"
                    data-testid={`link-tag-${tag}`}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            </motion.nav>
          )}
        </div>
      </div>
    </motion.header>
  );
}
