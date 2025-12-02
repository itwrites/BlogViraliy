import { motion, useReducedMotion, Variants } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import type { Site } from "@shared/schema";
import { Home } from "lucide-react";

type MenuActiveStyle = "underline" | "background" | "pill" | "bold";

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
    menuActiveStyle?: MenuActiveStyle;
  };
  variant?: "default" | "compact";
}

function getMenuItemClasses(isActive: boolean, isHome: boolean, style: MenuActiveStyle) {
  const baseClasses = "relative px-4 py-2 text-sm font-medium uppercase tracking-wide transition-all duration-200 whitespace-nowrap";
  
  if (isHome && !isActive) {
    return `${baseClasses} text-foreground/70 hover:text-primary`;
  }
  
  switch (style) {
    case "underline":
      return `${baseClasses} ${
        isActive 
          ? 'text-primary after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-primary after:rounded-full' 
          : 'text-foreground/70 hover:text-primary'
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
      return `${baseClasses} ${
        isActive 
          ? 'text-primary font-bold' 
          : 'text-foreground/70 hover:text-primary font-medium'
      }`;
    default:
      return baseClasses;
  }
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
  const menuActiveStyle = templateClasses.menuActiveStyle || "underline";
  const isHome = !currentTag;

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
        <div className={`flex items-center justify-between gap-6 ${variant === "compact" ? "h-14" : "py-4"}`}>
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
                onHomeClick={onLogoClick}
                siteTitle={site.title}
                currentTag={currentTag}
                menuActiveStyle={menuActiveStyle}
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

          <motion.nav 
            className="hidden md:flex items-center"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? false : "visible"}
            variants={containerAnimation}
            data-testid="nav-main"
          >
            <div className="flex items-center gap-1">
              <motion.button
                variants={itemAnimation}
                onClick={onLogoClick}
                className={getMenuItemClasses(isHome, true, menuActiveStyle)}
                data-testid="link-home"
                data-active={isHome}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <span className="flex items-center gap-1.5">
                  <Home className="h-4 w-4" />
                  HOME
                </span>
              </motion.button>
              
              {hasTags && topTags.slice(0, templateClasses.maxNavItems - 1).map((tag) => {
                const isActive = currentTag?.toLowerCase() === tag.toLowerCase();
                return (
                  <motion.button
                    key={tag}
                    variants={itemAnimation}
                    onClick={() => onTagClick(tag)}
                    className={getMenuItemClasses(isActive, false, menuActiveStyle)}
                    data-testid={`link-tag-${tag}`}
                    data-active={isActive}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  >
                    {tag.toUpperCase()}
                  </motion.button>
                );
              })}
            </div>
          </motion.nav>
        </div>
      </div>
    </motion.header>
  );
}
