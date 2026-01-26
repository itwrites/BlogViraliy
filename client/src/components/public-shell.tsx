import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import type { Site, SiteMenuItem, TemplateSettings } from "@shared/schema";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { TopBanner } from "@/components/top-banner";
import { GdprBanner } from "@/components/gdpr-banner";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { CustomCursor } from "@/components/custom-cursor";
import { useCallback, useMemo } from "react";
import { mergeThemeTokens, isValidTheme } from "@/lib/theme-registry";

interface PublicShellProps {
  site: Site;
  children: React.ReactNode;
  currentTag?: string | null;
  currentGroupSlug?: string | null;
}

function ShellContent({ 
  site, 
  mergedSettings,
  children,
  currentTag,
  currentGroupSlug
}: { 
  site: Site; 
  mergedSettings: TemplateSettings;
  children: React.ReactNode;
  currentTag?: string | null;
  currentGroupSlug?: string | null;
}) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(mergedSettings);
  const cursorStyle = mergedSettings.cursorStyle || "default";
  const basePath = site.basePath || "";

  const { data: topTags } = useQuery<string[]>({
    queryKey: ["/api/public/sites", site.id, "top-tags"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: menuItems } = useQuery<SiteMenuItem[]>({
    queryKey: ["/api/public/sites", site.id, "menu-items"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: site.menuMode === "manual",
  });

  const handleTagClick = useCallback((tag: string) => {
    // Router-relative path (no basePath prefix - router base handles it)
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  }, [setLocation]);

  const handleLogoClick = useCallback(() => {
    if (site.logoTargetUrl) {
      if (site.logoTargetUrl.startsWith("http")) {
        // External URL - use window.location
        window.location.href = site.logoTargetUrl;
      } else {
        // Internal URL - router-relative path
        setLocation(site.logoTargetUrl);
      }
    } else {
      // Default to home - router-relative path
      setLocation("/");
    }
  }, [setLocation, site.logoTargetUrl]);

  const memoizedTopTags = useMemo(() => topTags || [], [topTags]);
  const memoizedMenuItems = useMemo(() => menuItems || [], [menuItems]);

  return (
    <>
      {cursorStyle !== "default" && <CustomCursor style={cursorStyle} />}
      
      {mergedSettings?.topBannerEnabled && mergedSettings.topBannerMessage && (
        <TopBanner
          message={mergedSettings.topBannerMessage}
          backgroundColor={mergedSettings.topBannerBackgroundColor || "#3b82f6"}
          textColor={mergedSettings.topBannerTextColor || "#ffffff"}
          link={mergedSettings.topBannerLink}
          dismissible={mergedSettings.topBannerDismissible !== false}
          siteId={String(site.id)}
        />
      )}

      <PublicHeader
        site={site}
        topTags={memoizedTopTags}
        menuItems={memoizedMenuItems}
        onTagClick={handleTagClick}
        onLogoClick={handleLogoClick}
        currentTag={currentTag}
        currentGroupSlug={currentGroupSlug}
        templateClasses={templateClasses}
        basePath={basePath}
      />
      
      {children}
      
      <PublicFooter 
        site={site} 
        topTags={memoizedTopTags} 
        onTagClick={handleTagClick}
        mergedSettings={mergedSettings}
      />
      
      {mergedSettings?.gdprBannerEnabled && (
        <GdprBanner
          message={mergedSettings.gdprBannerMessage || "We use cookies to improve your experience and for analytics. By continuing to use this site, you consent to our use of cookies."}
          acceptButtonText={mergedSettings.gdprBannerButtonText || "Accept"}
          declineButtonText={mergedSettings.gdprBannerDeclineText || "Decline"}
          backgroundColor={mergedSettings.gdprBannerBackgroundColor || "#1f2937"}
          textColor={mergedSettings.gdprBannerTextColor || "#ffffff"}
          siteId={String(site.id)}
          analyticsId={site.analyticsId || undefined}
        />
      )}
    </>
  );
}

export function PublicShell({ site, children, currentTag, currentGroupSlug }: PublicShellProps) {
  const themeId = site.siteType || "forbis";
  
  const mergedSettings = useMemo(() => {
    if (!isValidTheme(themeId)) {
      console.warn(`[PublicShell] Unknown theme "${themeId}", falling back to Forbis defaults`);
      return mergeThemeTokens("forbis", site.templateSettings || {});
    }
    return mergeThemeTokens(themeId, site.templateSettings || {});
  }, [themeId, site.templateSettings]);

  return (
    <PublicThemeProvider settings={mergedSettings}>
      <SeoHead site={site} />
      <ShellContent site={site} mergedSettings={mergedSettings} currentTag={currentTag} currentGroupSlug={currentGroupSlug}>
        {children}
      </ShellContent>
    </PublicThemeProvider>
  );
}

export { useTemplateClasses };
