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

function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, '');
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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function adjustLightness(hsl: string, amount: number): string {
  const [h, s, l] = hsl.split(' ');
  const lVal = parseFloat(l);
  const newL = Math.max(0, Math.min(100, lVal + amount));
  return `${h} ${s} ${newL}%`;
}

export function PublicThemeProvider({ settings, children }: PublicThemeProviderProps) {
  const s = settings || defaultTemplateSettings;
  const originalValues = useRef<Map<string, string>>(new Map());
  const appliedVars = useRef<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const style = root.style;

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

    saveAndSet('--background', bgHsl);
    saveAndSet('--foreground', textHsl);
    saveAndSet('--card', adjustLightness(bgHsl, -2));
    saveAndSet('--card-foreground', textHsl);
    saveAndSet('--primary', primaryHsl);
    saveAndSet('--primary-foreground', '0 0% 98%');
    saveAndSet('--secondary', secondaryHsl);
    saveAndSet('--secondary-foreground', '0 0% 98%');
    saveAndSet('--muted', adjustLightness(bgHsl, -8));
    saveAndSet('--muted-foreground', adjustLightness(textHsl, 30));
    saveAndSet('--accent', adjustLightness(primaryHsl, 35));
    saveAndSet('--accent-foreground', textHsl);
    saveAndSet('--border', adjustLightness(bgHsl, -12));
    saveAndSet('--popover', adjustLightness(bgHsl, -4));
    saveAndSet('--popover-foreground', textHsl);

    saveAndSet('--public-heading-font', fontFamilies[s.headingFont] || fontFamilies.modern);
    saveAndSet('--public-body-font', fontFamilies[s.bodyFont] || fontFamilies.modern);
    saveAndSet('--public-font-base', fontScales[s.fontScale]?.base || fontScales.normal.base);
    saveAndSet('--public-font-heading', fontScales[s.fontScale]?.heading || fontScales.normal.heading);
    saveAndSet('--public-font-hero', fontScales[s.fontScale]?.hero || fontScales.normal.hero);

    return () => {
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
  }, [s.backgroundColor, s.textColor, s.primaryColor, s.secondaryColor, s.headingFont, s.bodyFont, s.fontScale]);

  const bodyFont = fontFamilies[s.bodyFont] || fontFamilies.modern;

  return (
    <div style={{ fontFamily: bodyFont }} className="public-theme">
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
