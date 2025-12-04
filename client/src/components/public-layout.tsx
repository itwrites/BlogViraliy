import type { Site } from "@shared/schema";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { TopBanner } from "@/components/top-banner";
import { GdprBanner } from "@/components/gdpr-banner";
import type { Post } from "@shared/schema";

interface PublicLayoutProps {
  site: Site;
  post?: Post;
  children: React.ReactNode;
}

function LayoutContent({ site, children }: { site: Site; children: React.ReactNode }) {
  const settings = site.templateSettings;
  
  return (
    <>
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

export function PublicLayout({ site, post, children }: PublicLayoutProps) {
  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} post={post} />
      <LayoutContent site={site}>
        {children}
      </LayoutContent>
    </PublicThemeProvider>
  );
}
