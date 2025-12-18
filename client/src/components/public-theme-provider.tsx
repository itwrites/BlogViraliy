import { useEffect, useRef } from "react";
import type { TemplateSettings } from "@shared/schema";
import { defaultTemplateSettings } from "@shared/schema";

interface PublicThemeProviderProps {
  settings: TemplateSettings | null | undefined;
  children: React.ReactNode;
}

const fontFamilies: Record<string, string> = {
  modern: "Inter, system-ui, sans-serif",
  classic: "Georgia, Times New Roman, serif",
  editorial: "Merriweather, Georgia, serif",
  tech: "JetBrains Mono, Roboto Mono, monospace",
  elegant: "Playfair Display, Georgia, serif",
};

const fontScales: Record<string, { base: string; heading: string; hero: string }> = {
  compact: { base: "0.875rem", heading: "1.5rem", hero: "2.5rem" },
  normal: { base: "1rem", heading: "1.875rem", hero: "3rem" },
  spacious: { base: "1.125rem", heading: "2.25rem", hero: "3.5rem" },
};

const logoSizes: Record<string, { class: string; px: number }> = {
  small: { class: "w-8", px: 32 },
  medium: { class: "w-12", px: 48 },
  large: { class: "w-14", px: 56 },
  custom: { class: "", px: 48 },
};

const contentWidths: Record<string, string> = {
  narrow: "max-w-4xl",
  medium: "max-w-6xl",
  wide: "max-w-7xl",
};

const cardStyles: Record<string, { 
  container: string; 
  image: string; 
  imageBottom: string;
  hover: string;
  radius: string;
  radiusSm: string;
  radiusLg: string;
}> = {
  rounded: { 
    container: "rounded-xl border bg-card shadow-sm", 
    image: "rounded-t-xl",
    imageBottom: "rounded-b-xl",
    hover: "hover:shadow-lg hover:border-primary/20 transition-all duration-300",
    radius: "rounded-xl",
    radiusSm: "rounded-lg",
    radiusLg: "rounded-2xl",
  },
  sharp: { 
    container: "rounded-none border bg-card shadow-sm", 
    image: "rounded-none",
    imageBottom: "rounded-none",
    hover: "hover:shadow-lg hover:border-primary/30 transition-all duration-300",
    radius: "rounded-none",
    radiusSm: "rounded-none",
    radiusLg: "rounded-none",
  },
  borderless: { 
    container: "rounded-lg border-0 shadow-none bg-transparent", 
    image: "rounded-lg",
    imageBottom: "rounded-b-lg",
    hover: "hover:bg-muted/50 transition-all duration-300",
    radius: "rounded-lg",
    radiusSm: "rounded-md",
    radiusLg: "rounded-xl",
  },
};

const menuSpacings: Record<string, string> = {
  compact: "gap-0",
  normal: "gap-1",
  relaxed: "gap-2",
  spacious: "gap-4",
};

const menuItemPaddings: Record<string, string> = {
  compact: "px-2 py-1.5",
  normal: "px-4 py-2",
  relaxed: "px-5 py-2.5",
  spacious: "px-6 py-3",
};

const headerStyles: Record<string, { height: string; padding: string; border: string; blur: string }> = {
  minimal: {
    height: "h-14",
    padding: "py-2",
    border: "border-b-0",
    blur: "bg-background/80 backdrop-blur-sm"
  },
  standard: {
    height: "h-16",
    padding: "py-3",
    border: "border-b",
    blur: "bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80"
  },
  full: {
    height: "h-20",
    padding: "py-4",
    border: "border-b",
    blur: "bg-card backdrop-blur-lg"
  },
};

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  hex = hex.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToString(hsl: { h: number; s: number; l: number }): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function adjustLightness(hsl: { h: number; s: number; l: number }, amount: number): string {
  const newL = Math.max(0, Math.min(100, hsl.l + amount));
  return `${hsl.h} ${hsl.s}% ${newL}%`;
}

function getContrastForeground(hsl: { h: number; s: number; l: number }): string {
  return hsl.l > 50 ? "0 0% 12%" : "0 0% 98%";
}

export function PublicThemeProvider({ settings, children }: PublicThemeProviderProps) {
  const s = settings || defaultTemplateSettings;
  const originalValues = useRef<Map<string, string>>(new Map());
  const appliedVars = useRef<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const style = root.style;

    const cleanup = () => {
      appliedVars.current.forEach(prop => {
        const original = originalValues.current.get(prop);
        if (original !== undefined) {
          if (original) {
            style.setProperty(prop, original);
          } else {
            style.removeProperty(prop);
          }
        }
      });
      originalValues.current.clear();
      appliedVars.current = [];
    };

    const saveAndSet = (prop: string, value: string) => {
      if (!originalValues.current.has(prop)) {
        originalValues.current.set(prop, style.getPropertyValue(prop));
      }
      style.setProperty(prop, value);
      if (!appliedVars.current.includes(prop)) {
        appliedVars.current.push(prop);
      }
    };

    const bgHsl = hexToHsl(s.backgroundColor);
    const textHsl = hexToHsl(s.textColor);
    const primaryHsl = hexToHsl(s.primaryColor);
    const secondaryHsl = hexToHsl(s.secondaryColor);

    if (!bgHsl || !textHsl || !primaryHsl || !secondaryHsl) {
      return cleanup;
    }

    const isLight = bgHsl.l > 50;
    const adjust = (amount: number) => isLight ? -amount : amount;

    saveAndSet('--background', hslToString(bgHsl));
    saveAndSet('--foreground', hslToString(textHsl));

    saveAndSet('--card', adjustLightness(bgHsl, adjust(4)));
    saveAndSet('--card-foreground', hslToString(textHsl));
    saveAndSet('--card-border', adjustLightness(bgHsl, adjust(12)));

    saveAndSet('--popover', adjustLightness(bgHsl, adjust(6)));
    saveAndSet('--popover-foreground', hslToString(textHsl));
    saveAndSet('--popover-border', adjustLightness(bgHsl, adjust(14)));

    saveAndSet('--primary', hslToString(primaryHsl));
    saveAndSet('--primary-foreground', getContrastForeground(primaryHsl));
    saveAndSet('--primary-border', adjustLightness(primaryHsl, -10));

    saveAndSet('--secondary', hslToString(secondaryHsl));
    saveAndSet('--secondary-foreground', getContrastForeground(secondaryHsl));

    saveAndSet('--muted', adjustLightness(bgHsl, adjust(10)));
    saveAndSet('--muted-foreground', adjustLightness(textHsl, isLight ? 30 : -30));

    const accentL = primaryHsl.l > 50 ? -10 : 30;
    saveAndSet('--accent', adjustLightness(primaryHsl, accentL));
    saveAndSet('--accent-foreground', getContrastForeground(primaryHsl));
    saveAndSet('--accent-border', adjustLightness(primaryHsl, accentL - 10));

    saveAndSet('--border', adjustLightness(bgHsl, adjust(12)));
    saveAndSet('--input', adjustLightness(bgHsl, adjust(20)));
    saveAndSet('--ring', hslToString(primaryHsl));

    saveAndSet('--destructive', '0 84% 42%');
    saveAndSet('--destructive-foreground', '0 0% 98%');

    saveAndSet('--sidebar', adjustLightness(bgHsl, adjust(6)));
    saveAndSet('--sidebar-foreground', hslToString(textHsl));
    saveAndSet('--sidebar-border', adjustLightness(bgHsl, adjust(12)));
    saveAndSet('--sidebar-primary', hslToString(primaryHsl));
    saveAndSet('--sidebar-primary-foreground', getContrastForeground(primaryHsl));
    saveAndSet('--sidebar-accent', adjustLightness(primaryHsl, 30));
    saveAndSet('--sidebar-accent-foreground', getContrastForeground(primaryHsl));
    saveAndSet('--sidebar-ring', hslToString(primaryHsl));

    saveAndSet('--font-sans', fontFamilies[s.bodyFont] || fontFamilies.modern);

    return cleanup;
  }, [s.backgroundColor, s.textColor, s.primaryColor, s.secondaryColor, s.headingFont, s.bodyFont, s.fontScale]);

  const headingFont = fontFamilies[s.headingFont] || fontFamilies.modern;
  const bodyFont = fontFamilies[s.bodyFont] || fontFamilies.modern;
  const fontSize = fontScales[s.fontScale]?.base || fontScales.normal.base;

  return (
    <div
      style={{
        fontFamily: bodyFont,
        fontSize,
        '--public-heading-font': headingFont,
        '--public-body-font': bodyFont,
        '--public-font-base': fontSize,
        '--public-font-heading': fontScales[s.fontScale]?.heading || fontScales.normal.heading,
        '--public-font-hero': fontScales[s.fontScale]?.hero || fontScales.normal.hero,
      } as React.CSSProperties}
      className="public-theme"
    >
      {children}
    </div>
  );
}

export function useTemplateClasses(settings: TemplateSettings | null | undefined) {
  const s = settings || defaultTemplateSettings;

  const hasSocials = Boolean(
    (s.socialTwitter && s.socialTwitter.trim()) ||
    (s.socialFacebook && s.socialFacebook.trim()) ||
    (s.socialInstagram && s.socialInstagram.trim()) ||
    (s.socialLinkedin && s.socialLinkedin.trim())
  );

  const getLogoSize = () => {
    if (s.logoSize === "custom") {
      const px = s.logoSizeCustom || 48;
      return { class: "", px, style: { width: px, height: "auto" as const } };
    }
    const size = logoSizes[s.logoSize] || logoSizes.medium;
    return { class: size.class, px: size.px, style: { width: size.px, height: "auto" as const } };
  };

  const getHeaderStyle = () => {
    const style = headerStyles[s.headerStyle] || headerStyles.standard;
    const hasCustomBg = s.headerBackgroundColor && s.headerBackgroundColor.trim();
    const hasCustomText = s.headerTextColor && s.headerTextColor.trim();
    
    return {
      ...style,
      isSticky: s.headerStyle === "standard" || s.headerStyle === "full",
      customBackground: hasCustomBg ? s.headerBackgroundColor : null,
      customTextColor: hasCustomText ? s.headerTextColor : null,
    };
  };

  const getCardStyle = () => {
    const style = cardStyles[s.cardStyle] || cardStyles.rounded;
    return {
      ...style,
      style: s.cardStyle || "rounded",
      simple: s.cardStyle === "borderless" ? "border-0 shadow-none" : 
              s.cardStyle === "sharp" ? "rounded-none border" : "rounded-lg border",
    };
  };

  return {
    logoSize: getLogoSize(),
    hideLogoText: s.hideLogoText || false,
    headerLogoInvertColors: s.headerLogoInvertColors || false,
    contentWidth: contentWidths[s.contentWidth] || contentWidths.medium,
    cardStyle: getCardStyle(),
    headerStyle: getHeaderStyle(),
    isHeaderSticky: s.headerStyle === "standard" || s.headerStyle === "full",
    showHero: s.showFeaturedHero,
    showSearch: s.showSearch,
    maxNavItems: s.maxNavItems,
    menuActiveStyle: s.menuActiveStyle || "underline",
    menuSpacing: menuSpacings[s.menuSpacing || "normal"] || menuSpacings.normal,
    menuItemPadding: menuItemPaddings[s.menuSpacing || "normal"] || menuItemPaddings.normal,
    showMenuIcons: s.showMenuIcons !== false,
    cursorStyle: s.cursorStyle || "default",
    postCardStyle: s.postCardStyle || "standard",
    postsPerPage: s.postsPerPage || 12,
    fontScale: s.fontScale || "normal",
    footerText: s.footerText || "",
    hasSocials,
    socials: {
      twitter: (s.socialTwitter || "").trim(),
      facebook: (s.socialFacebook || "").trim(),
      instagram: (s.socialInstagram || "").trim(),
      linkedin: (s.socialLinkedin || "").trim(),
    },
  };
}
