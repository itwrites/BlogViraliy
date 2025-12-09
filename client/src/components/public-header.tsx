import { motion, useReducedMotion, Variants } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import type { Site, SiteMenuItem } from "@shared/schema";
import { ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

type MenuActiveStyle = "underline" | "background" | "pill" | "bold";

interface HeaderStyleConfig {
  height: string;
  padding: string;
  border: string;
  blur: string;
  isSticky: boolean;
  customBackground?: string | null;
  customTextColor?: string | null;
}

interface PublicHeaderProps {
  site: Site;
  topTags: string[];
  menuItems?: SiteMenuItem[];
  onTagClick: (tag: string) => void;
  onLogoClick: () => void;
  onMenuItemClick?: (item: SiteMenuItem) => void;
  currentTag?: string | null;
  currentGroupSlug?: string | null;
  templateClasses: {
    contentWidth: string;
    logoSize: { style: { width: number; height: number } };
    isHeaderSticky: boolean;
    maxNavItems: number;
    hideLogoText?: boolean;
    menuActiveStyle?: MenuActiveStyle;
    menuSpacing?: string;
    menuItemPadding?: string;
    showMenuIcons?: boolean;
    headerStyle?: HeaderStyleConfig;
  };
  variant?: "default" | "compact";
  basePath?: string;
}

function getMenuItemClasses(
  isActive: boolean, 
  isHome: boolean, 
  style: MenuActiveStyle,
  hasCustomBackground: boolean = false,
  customPadding?: string
) {
  const padding = customPadding || "px-4 py-2";
  const baseClasses = `relative ${padding} text-sm font-medium uppercase tracking-wide transition-all duration-200 whitespace-nowrap`;
  
  // When custom background is set, use neutral hover effects that work with any color
  const hoverTextClass = hasCustomBackground ? "hover:opacity-100" : "hover:text-primary";
  const inactiveTextClass = hasCustomBackground ? "opacity-70" : "text-current/70";
  const hoverBgClass = hasCustomBackground ? "hover:bg-white/10" : "hover:bg-primary/5";
  const hoverBgMutedClass = hasCustomBackground ? "hover:bg-white/15" : "hover:bg-muted";
  
  if (isHome && !isActive) {
    return `${baseClasses} ${inactiveTextClass} ${hoverTextClass}`;
  }
  
  switch (style) {
    case "underline":
      return `${baseClasses} ${
        isActive 
          ? `${hasCustomBackground ? 'opacity-100' : 'text-primary'} after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-current after:rounded-full` 
          : `${inactiveTextClass} ${hoverTextClass}`
      }`;
    case "background":
      return `${baseClasses} rounded-md ${
        isActive 
          ? `${hasCustomBackground ? 'bg-white/20 opacity-100' : 'bg-primary/10 text-primary'}` 
          : `${inactiveTextClass} ${hoverTextClass} ${hoverBgClass}`
      }`;
    case "pill":
      return `${baseClasses} rounded-full ${
        isActive 
          ? `${hasCustomBackground ? 'bg-white/25 opacity-100' : 'bg-primary text-primary-foreground'}` 
          : `${inactiveTextClass} ${hoverTextClass} ${hoverBgMutedClass}`
      }`;
    case "bold":
      return `${baseClasses} ${
        isActive 
          ? `${hasCustomBackground ? 'opacity-100' : 'text-primary'} font-bold` 
          : `${inactiveTextClass} ${hoverTextClass} font-medium`
      }`;
    default:
      return baseClasses;
  }
}

export function PublicHeader({ 
  site, 
  topTags,
  menuItems = [],
  onTagClick, 
  onLogoClick,
  onMenuItemClick,
  currentTag,
  currentGroupSlug,
  templateClasses,
  variant = "default",
  basePath = ""
}: PublicHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [location, setLocation] = useLocation();
  const menuActiveStyle = templateClasses.menuActiveStyle || "underline";
  const menuSpacing = templateClasses.menuSpacing || "gap-1";
  const menuItemPadding = templateClasses.menuItemPadding;
  const showMenuIcons = templateClasses.showMenuIcons !== false;
  const isHome = !currentTag && !currentGroupSlug;
  const hasCustomBackground = Boolean(templateClasses.headerStyle?.customBackground);
  
  const isManualMode = site.menuMode === "manual";
  
  const headerConfig = templateClasses.headerStyle || {
    height: "h-16",
    padding: "py-3",
    border: "border-b",
    blur: "bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80",
    isSticky: true,
    customBackground: null,
    customTextColor: null,
  };

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

  const headerStyles: React.CSSProperties = {};
  if (headerConfig.customBackground) {
    headerStyles.backgroundColor = headerConfig.customBackground;
  }
  if (headerConfig.customTextColor) {
    headerStyles.color = headerConfig.customTextColor;
  }

  const headerClasses = [
    headerConfig.isSticky ? 'sticky top-0 z-50' : '',
    headerConfig.border,
    headerConfig.customBackground ? '' : headerConfig.blur,
  ].filter(Boolean).join(' ');

  return (
    <motion.header 
      {...headerAnimation}
      className={headerClasses}
      style={headerStyles}
    >
      <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6`}>
        <div className={`flex items-center gap-4 sm:gap-6 ${variant === "compact" ? "h-14" : headerConfig.padding}`}>
          {/* Mobile menu button */}
          {(hasTags || isManualMode) && (
            <MobileNav 
              tags={topTags}
              menuItems={menuItems}
              isManualMode={isManualMode}
              onTagClick={onTagClick} 
              onHomeClick={onLogoClick}
              onMenuItemClick={onMenuItemClick}
              siteTitle={site.title}
              currentTag={currentTag}
              currentGroupSlug={currentGroupSlug}
              menuActiveStyle={menuActiveStyle}
              showMenuIcons={showMenuIcons}
              basePath={basePath}
            />
          )}
          
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 sm:gap-4 flex-shrink-0"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? false : "visible"}
            variants={containerAnimation}
          >
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
                  className="w-full h-full object-contain"
                  style={{ display: 'block' }}
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

          {/* Desktop Navigation - flows naturally after logo */}
          <motion.nav 
            className="hidden md:flex items-center flex-1"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? false : "visible"}
            variants={containerAnimation}
            data-testid="nav-main"
          >
            <div className={`flex items-center ${menuSpacing}`}>
              {isManualMode ? (
                menuItems.slice(0, templateClasses.maxNavItems).map((item) => {
                  // For active state: compare against router-relative paths (without basePath)
                  const isActive = item.type === "tag_group" 
                    ? currentGroupSlug === item.groupSlug
                    : Boolean(item.href && !item.href.startsWith("http") && location.startsWith(item.href));
                  
                  const handleClick = () => {
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
                  };
                  
                  return (
                    <motion.button
                      key={item.id}
                      variants={itemAnimation}
                      onClick={handleClick}
                      className={getMenuItemClasses(isActive, false, menuActiveStyle, hasCustomBackground, menuItemPadding)}
                      data-testid={`link-menu-${item.id}`}
                      data-active={isActive}
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    >
                      <span className="flex items-center gap-1.5">
                        {item.label.toUpperCase()}
                        {item.type === "url" && item.openInNewTab && (
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    </motion.button>
                  );
                })
              ) : (
                hasTags && topTags.slice(0, templateClasses.maxNavItems).map((tag) => {
                  const isActive = currentTag?.toLowerCase() === tag.toLowerCase();
                  return (
                    <motion.button
                      key={tag}
                      variants={itemAnimation}
                      onClick={() => onTagClick(tag)}
                      className={getMenuItemClasses(isActive, false, menuActiveStyle, hasCustomBackground, menuItemPadding)}
                      data-testid={`link-tag-${tag}`}
                      data-active={isActive}
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    >
                      {tag.toUpperCase()}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.nav>
        </div>
      </div>
    </motion.header>
  );
}
