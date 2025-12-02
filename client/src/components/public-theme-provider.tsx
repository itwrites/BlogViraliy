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

const logoSizes: Record<string, string> = {
  small: "h-8 w-8",
  medium: "h-10 w-10",
  large: "h-14 w-14",
};

const contentWidths: Record<string, string> = {
  narrow: "max-w-4xl",
  medium: "max-w-6xl",
  wide: "max-w-7xl",
};

const cardStyles: Record<string, string> = {
  rounded: "rounded-lg",
  sharp: "rounded-none",
  borderless: "border-0 shadow-none",
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

  return {
    logoSize: logoSizes[s.logoSize] || logoSizes.medium,
    hideLogoText: s.hideLogoText || false,
    contentWidth: contentWidths[s.contentWidth] || contentWidths.medium,
    cardStyle: cardStyles[s.cardStyle] || cardStyles.rounded,
    isHeaderSticky: s.headerStyle === "standard" || s.headerStyle === "full",
    showHero: s.showFeaturedHero,
    showSearch: s.showSearch,
    maxNavItems: s.maxNavItems,
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
