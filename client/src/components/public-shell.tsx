import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import type { Site } from "@shared/schema";
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
}

function ShellContent({ 
  site, 
  children,
  currentTag
}: { 
  site: Site; 
  children: React.ReactNode;
  currentTag?: string | null;
}) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const settings = site.templateSettings;
  const cursorStyle = settings?.cursorStyle || "default";

  const { data: topTags } = useQuery<string[]>({
    queryKey: ["/api/public/sites", site.id, "top-tags"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleTagClick = useCallback((tag: string) => {
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  }, [setLocation]);

  const handleLogoClick = useCallback(() => {
    setLocation("/");
  }, [setLocation]);

  const memoizedTopTags = useMemo(() => topTags || [], [topTags]);

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
        onTagClick={handleTagClick}
        onLogoClick={handleLogoClick}
        currentTag={currentTag}
        templateClasses={templateClasses}
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

export function PublicShell({ site, children, currentTag }: PublicShellProps) {
  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <ShellContent site={site} currentTag={currentTag}>
        {children}
      </ShellContent>
    </PublicThemeProvider>
  );
}

export { useTemplateClasses };
