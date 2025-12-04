import type { Site } from "@shared/schema";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { TopBanner } from "@/components/top-banner";
import { GdprBanner } from "@/components/gdpr-banner";
import { PublicFooter } from "@/components/public-footer";
import { CustomCursor } from "@/components/custom-cursor";
import type { Post } from "@shared/schema";

interface PublicLayoutProps {
  site: Site;
  post?: Post;
  topTags?: string[];
  onTagClick?: (tag: string) => void;
  children: React.ReactNode;
  hideFooter?: boolean;
}

function LayoutContent({ 
  site, 
  topTags, 
  onTagClick, 
  hideFooter,
  children 
}: { 
  site: Site; 
  topTags?: string[]; 
  onTagClick?: (tag: string) => void;
  hideFooter?: boolean;
  children: React.ReactNode;
}) {
  const settings = site.templateSettings;
  const cursorStyle = settings?.cursorStyle || "default";
  
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
      
      {children}
      
      {!hideFooter && (
        <PublicFooter 
          site={site} 
          topTags={topTags} 
          onTagClick={onTagClick} 
        />
      )}
      
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

export function PublicLayout({ site, post, topTags, onTagClick, hideFooter, children }: PublicLayoutProps) {
  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} post={post} />
      <LayoutContent site={site} topTags={topTags} onTagClick={onTagClick} hideFooter={hideFooter}>
        {children}
      </LayoutContent>
    </PublicThemeProvider>
  );
}
