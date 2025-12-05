import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import type { Site, SiteMenuItem } from "@shared/schema";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { TopBanner } from "@/components/top-banner";
import { GdprBanner } from "@/components/gdpr-banner";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { CustomCursor } from "@/components/custom-cursor";
import { useCallback, useMemo } from "react";

interface PublicShellProps {
  site: Site;
  children: React.ReactNode;
  currentTag?: string | null;
  currentGroupSlug?: string | null;
}

function ShellContent({ 
  site, 
  children,
  currentTag,
  currentGroupSlug
}: { 
  site: Site; 
  children: React.ReactNode;
  currentTag?: string | null;
  currentGroupSlug?: string | null;
}) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const settings = site.templateSettings;
  const cursorStyle = settings?.cursorStyle || "default";
  const basePath = site.basePath || "";

  const { data: topTags } = useQuery<string[]>({
    queryKey: ["/api/public/sites", site.id, "top-tags"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: menuItems } = useQuery<SiteMenuItem[]>({
    queryKey: ["/api/sites", site.id, "menu-items"],
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
      
      {settings?.topBannerEnabled && settings.topBannerMessage && (
        <TopBanner
          message={settings.topBannerMessage}
          backgroundColor={settings.topBannerBackgroundColor || "#3b82f6"}
          textColor={settings.topBannerTextColor || "#ffffff"}
          link={settings.topBannerLink}
          dismissible={settings.topBannerDismissible !== false}
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
      />
      
      {settings?.gdprBannerEnabled && (
        <GdprBanner
          message={settings.gdprBannerMessage || "We use cookies to improve your experience and for analytics. By continuing to use this site, you consent to our use of cookies."}
          acceptButtonText={settings.gdprBannerButtonText || "Accept"}
          declineButtonText={settings.gdprBannerDeclineText || "Decline"}
          backgroundColor={settings.gdprBannerBackgroundColor || "#1f2937"}
          textColor={settings.gdprBannerTextColor || "#ffffff"}
          siteId={String(site.id)}
          analyticsId={site.analyticsId || undefined}
        />
      )}
    </>
  );
}

export function PublicShell({ site, children, currentTag, currentGroupSlug }: PublicShellProps) {
  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <ShellContent site={site} currentTag={currentTag} currentGroupSlug={currentGroupSlug}>
        {children}
      </ShellContent>
    </PublicThemeProvider>
  );
}

export { useTemplateClasses };
