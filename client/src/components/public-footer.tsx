import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github } from "lucide-react";
import { SiTiktok, SiPinterest } from "react-icons/si";
import type { Site, TemplateSettings } from "@shared/schema";
import { useTemplateClasses } from "@/components/public-theme-provider";

interface PublicFooterProps {
  site: Site;
  topTags?: string[];
  onTagClick?: (tag: string) => void;
  mergedSettings?: TemplateSettings;
}

export function PublicFooter({ site, topTags = [], onTagClick, mergedSettings }: PublicFooterProps) {
  const settings = mergedSettings || site.templateSettings;
  const templateClasses = useTemplateClasses(settings);
  const prefersReducedMotion = useReducedMotion();

  const footerLayout = settings?.footerLayout || "columns";
  const backgroundColor = settings?.footerBackgroundColor || "#1f2937";
  const textColor = settings?.footerTextColor || "#9ca3af";
  const linkColor = settings?.footerLinkColor || "#ffffff";
  const showLogo = settings?.footerShowLogo !== false;
  const footerLogoUrl = settings?.footerLogoUrl || "";
  const footerLogoInvertColors = settings?.footerLogoInvertColors || false;
  const aboutText = settings?.footerAboutText || "";
  const showNavLinks = settings?.footerShowNavLinks !== false;
  const showSocialIcons = settings?.footerShowSocialIcons !== false;
  const showPoweredBy = settings?.footerShowPoweredBy !== false;
  const copyrightText = settings?.footerCopyrightText || "";
  const footerText = settings?.footerText || "";

  const socials = {
    twitter: settings?.socialTwitter || "",
    facebook: settings?.socialFacebook || "",
    instagram: settings?.socialInstagram || "",
    linkedin: settings?.socialLinkedin || "",
    youtube: settings?.socialYoutube || "",
    tiktok: settings?.socialTiktok || "",
    pinterest: settings?.socialPinterest || "",
    github: settings?.socialGithub || "",
  };

  const hasSocials = Object.values(socials).some(v => v.trim());
  const displayTags = topTags.slice(0, 6);
  const logoSizePx = templateClasses.logoSize?.px || 40;
  const displayLogoUrl = footerLogoUrl || site.logoUrl;
  const isSvg = displayLogoUrl?.toLowerCase().endsWith('.svg');

  const containerVariants: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  const socialIconClass = "h-5 w-5 transition-all duration-200 hover:scale-110";

  const renderSocialIcons = () => {
    if (!hasSocials || !showSocialIcons) return null;

    return (
      <div className="flex items-center gap-4" data-testid="footer-social-icons">
        {socials.twitter && (
          <a 
            href={socials.twitter} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-twitter"
          >
            <Twitter className={socialIconClass} />
          </a>
        )}
        {socials.facebook && (
          <a 
            href={socials.facebook} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-facebook"
          >
            <Facebook className={socialIconClass} />
          </a>
        )}
        {socials.instagram && (
          <a 
            href={socials.instagram} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-instagram"
          >
            <Instagram className={socialIconClass} />
          </a>
        )}
        {socials.linkedin && (
          <a 
            href={socials.linkedin} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-linkedin"
          >
            <Linkedin className={socialIconClass} />
          </a>
        )}
        {socials.youtube && (
          <a 
            href={socials.youtube} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-youtube"
          >
            <Youtube className={socialIconClass} />
          </a>
        )}
        {socials.github && (
          <a 
            href={socials.github} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-github"
          >
            <Github className={socialIconClass} />
          </a>
        )}
        {socials.tiktok && (
          <a 
            href={socials.tiktok} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-tiktok"
          >
            <SiTiktok className={socialIconClass} />
          </a>
        )}
        {socials.pinterest && (
          <a 
            href={socials.pinterest} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: linkColor }}
            data-testid="link-footer-pinterest"
          >
            <SiPinterest className={socialIconClass} />
          </a>
        )}
      </div>
    );
  };

  const renderLogo = () => {
    if (!showLogo) return null;

    return (
      <div className="flex items-center gap-3">
        {displayLogoUrl && (
          <img 
            src={displayLogoUrl} 
            alt={site.title}
            style={{ 
              height: `${logoSizePx}px`,
              width: isSvg ? 'auto' : `${logoSizePx}px`,
              objectFit: 'contain',
              filter: footerLogoInvertColors ? 'invert(1) brightness(2)' : undefined
            }}
            className="flex-shrink-0"
            data-testid="img-footer-logo"
          />
        )}
        <span 
          className="text-lg font-semibold"
          style={{ color: linkColor }}
          data-testid="text-footer-site-title"
        >
          {site.title}
        </span>
      </div>
    );
  };

  const renderNavLinks = () => {
    if (!showNavLinks || displayTags.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: linkColor }}
        >
          Categories
        </h4>
        <ul className="space-y-2">
          {displayTags.map((tag) => (
            <li key={tag}>
              <button
                onClick={() => onTagClick?.(tag)}
                className="text-sm hover:underline transition-colors"
                style={{ color: textColor }}
                onMouseEnter={(e) => e.currentTarget.style.color = linkColor}
                onMouseLeave={(e) => e.currentTarget.style.color = textColor}
                data-testid={`link-footer-tag-${tag}`}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderCopyright = () => {
    const year = new Date().getFullYear();
    const displayCopyright = copyrightText || footerText || `© ${year} ${site.title}. All rights reserved.`;

    return (
      <p className="text-sm" style={{ color: textColor }} data-testid="text-footer-copyright">
        {displayCopyright}
      </p>
    );
  };

  if (footerLayout === "simple") {
    return (
      <motion.footer
        initial={prefersReducedMotion ? undefined : { opacity: 0 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-8 mt-16"
        style={{ backgroundColor }}
        data-testid="footer-simple"
      >
        <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {renderCopyright()}
            {renderSocialIcons()}
          </div>
        </div>
      </motion.footer>
    );
  }

  if (footerLayout === "centered") {
    return (
      <motion.footer
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-12 sm:py-16 mt-16"
        style={{ backgroundColor }}
        data-testid="footer-centered"
      >
        <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6`}>
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div variants={itemVariants}>
              {renderLogo()}
            </motion.div>

            {aboutText && (
              <motion.p 
                variants={itemVariants}
                className="max-w-md text-sm leading-relaxed"
                style={{ color: textColor }}
                data-testid="text-footer-about"
              >
                {aboutText}
              </motion.p>
            )}

            {showNavLinks && displayTags.length > 0 && (
              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
                {displayTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onTagClick?.(tag)}
                    className="text-sm hover:underline transition-colors"
                    style={{ color: textColor }}
                    onMouseEnter={(e) => e.currentTarget.style.color = linkColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = textColor}
                    data-testid={`link-footer-tag-${tag}`}
                  >
                    {tag}
                  </button>
                ))}
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              {renderSocialIcons()}
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="pt-6 border-t w-full max-w-md"
              style={{ borderColor: `${textColor}20` }}
            >
              {renderCopyright()}
            </motion.div>
          </div>
        </div>
      </motion.footer>
    );
  }

  return (
    <motion.footer
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="py-12 sm:py-16 mt-16"
      style={{ backgroundColor }}
      data-testid="footer-columns"
    >
      <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            {renderLogo()}
            {aboutText && (
              <p 
                className="text-sm leading-relaxed max-w-md"
                style={{ color: textColor }}
                data-testid="text-footer-about"
              >
                {aboutText}
              </p>
            )}
            <div className="pt-2">
              {renderSocialIcons()}
            </div>
          </motion.div>

          {showNavLinks && displayTags.length > 0 && (
            <motion.div variants={itemVariants}>
              {renderNavLinks()}
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="space-y-3">
            <h4 
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: linkColor }}
            >
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  className="text-sm hover:underline transition-colors"
                  style={{ color: textColor }}
                  onMouseEnter={(e) => e.currentTarget.style.color = linkColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = textColor}
                  data-testid="link-footer-home"
                >
                  Home
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        <motion.div 
          variants={itemVariants}
          className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: `${textColor}20` }}
        >
          {renderCopyright()}
          {showPoweredBy && (
            <p className="text-xs" style={{ color: textColor }}>
              Powered by Blog Virality
            </p>
          )}
        </motion.div>
      </div>
    </motion.footer>
  );
}
