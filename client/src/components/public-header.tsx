import { motion, useReducedMotion, Variants } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import type { Site } from "@shared/schema";

interface PublicHeaderProps {
  site: Site;
  topTags: string[];
  onTagClick: (tag: string) => void;
  onLogoClick: () => void;
  currentTag?: string | null;
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
  currentTag,
  templateClasses,
  variant = "default"
}: PublicHeaderProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: -8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
  };

  const logoAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
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

  const isSvg = site.logoUrl?.toLowerCase().endsWith('.svg');

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
                currentTag={currentTag}
              />
            )}
            {site.logoUrl && (
              <motion.div
                variants={logoAnimation}
                style={templateClasses.logoSize.style}
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onLogoClick}
                data-testid="img-site-logo"
              >
                <img
                  src={site.logoUrl}
                  alt={`${site.title} logo`}
                  className={`w-full h-full ${isSvg ? 'object-contain' : 'object-cover rounded'}`}
                />
              </motion.div>
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
                {topTags.slice(0, templateClasses.maxNavItems).map((tag) => {
                  const isActive = currentTag?.toLowerCase() === tag.toLowerCase();
                  return (
                    <motion.button
                      key={tag}
                      variants={itemAnimation}
                      onClick={() => onTagClick(tag)}
                      className={`px-3 py-2 text-sm rounded-md transition-all duration-200 whitespace-nowrap ${
                        isActive 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
                      }`}
                      style={isActive ? { color: 'hsl(var(--primary))' } : undefined}
                      data-testid={`link-tag-${tag}`}
                      data-active={isActive}
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    >
                      {tag}
                    </motion.button>
                  );
                })}
              </div>
            </motion.nav>
          )}
        </div>
      </div>
    </motion.header>
  );
}
