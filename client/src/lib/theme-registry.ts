import type { TemplateSettings } from "@shared/schema";
import { defaultTemplateSettings } from "@shared/schema";

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  category: "blog" | "news" | "business" | "creative";
  defaultTokens: Partial<TemplateSettings>;
  features: string[];
}

export const themeRegistry: Record<string, ThemeDefinition> = {
  blog: {
    id: "blog",
    name: "Blog",
    description: "Classic blog layout with featured hero and grid posts",
    category: "blog",
    defaultTokens: {
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "standard",
      postCardHoverEffect: "lift",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "dark",
    },
    features: ["Featured Hero", "Grid Layout", "Tag Navigation", "Reading Time"],
  },
  
  news: {
    id: "news",
    name: "News",
    description: "Professional news layout with breaking news sections",
    category: "news",
    defaultTokens: {
      primaryColor: "#dc2626",
      secondaryColor: "#1e40af",
      backgroundColor: "#ffffff",
      textColor: "#111827",
      headingFont: "editorial",
      bodyFont: "modern",
      cardStyle: "sharp",
      postCardStyle: "editorial",
      postCardHoverEffect: "lift",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "full",
      footerColorMode: "primary",
    },
    features: ["Breaking News Banner", "Section Grid", "Trending Sidebar", "Live Updates"],
  },
  
  forbis: {
    id: "forbis",
    name: "Forbis",
    description: "Business Authority (Default)",
    category: "business",
    defaultTokens: {
      primaryColor: "#000000",
      secondaryColor: "#666666",
      backgroundColor: "#ffffff",
      textColor: "#1a1a1a",
      headingFont: "elegant",
      bodyFont: "editorial",
      cardStyle: "borderless",
      postCardStyle: "editorial",
      postCardHoverEffect: "none",
      showFeaturedHero: false,
      contentWidth: "wide",
      headerStyle: "standard",
      footerColorMode: "dark",
    },
    features: ["Forbes-Style Layout", "Trending Ticker", "Popular/Breaking Tabs", "Author Bylines", "Category Badges"],
  },
  
  magazine: {
    id: "magazine",
    name: "Magazine",
    description: "Media / Lifestyle",
    category: "creative",
    defaultTokens: {
      primaryColor: "#7c3aed",
      secondaryColor: "#db2777",
      backgroundColor: "#fafafa",
      textColor: "#1f2937",
      headingFont: "elegant",
      bodyFont: "editorial",
      cardStyle: "rounded",
      postCardStyle: "overlay",
      postCardHoverEffect: "zoom",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "standard",
      footerColorMode: "secondary",
    },
    features: ["Cover Stories", "Category Sections", "Author Profiles", "Rich Media"],
  },
  
  novapress: {
    id: "novapress",
    name: "NovaPress",
    description: "Modern editorial theme with bold typography",
    category: "creative",
    defaultTokens: {
      primaryColor: "#0ea5e9",
      secondaryColor: "#f59e0b",
      backgroundColor: "#0f172a",
      textColor: "#f1f5f9",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "borderless",
      postCardStyle: "minimal",
      postCardHoverEffect: "glow",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "minimal",
      footerColorMode: "dark",
      footerBackgroundColor: "#020617",
    },
    features: ["Dark Mode", "Minimal Cards", "Focus Mode", "Code Highlighting"],
  },
  
  portfolio: {
    id: "portfolio",
    name: "Portfolio",
    description: "Visual / Brand",
    category: "business",
    defaultTokens: {
      primaryColor: "#10b981",
      secondaryColor: "#6366f1",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "standard",
      postCardHoverEffect: "lift",
      showFeaturedHero: false,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "light",
    },
    features: ["Project Grid", "Case Studies", "Skills Section", "Contact Form"],
  },
  
  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    description: "Warm restaurant theme with menu showcasing",
    category: "business",
    defaultTokens: {
      primaryColor: "#b45309",
      secondaryColor: "#059669",
      backgroundColor: "#fffbeb",
      textColor: "#451a03",
      headingFont: "elegant",
      bodyFont: "editorial",
      cardStyle: "rounded",
      postCardStyle: "overlay",
      postCardHoverEffect: "zoom",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "full",
      footerColorMode: "primary",
    },
    features: ["Menu Cards", "Reservation CTA", "Gallery", "Hours & Location"],
  },
  
  crypto: {
    id: "crypto",
    name: "Crypto",
    description: "Modern crypto/fintech theme with dark aesthetics",
    category: "business",
    defaultTokens: {
      primaryColor: "#22c55e",
      secondaryColor: "#eab308",
      backgroundColor: "#09090b",
      textColor: "#fafafa",
      headingFont: "tech",
      bodyFont: "modern",
      cardStyle: "sharp",
      postCardStyle: "minimal",
      postCardHoverEffect: "glow",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "dark",
      footerBackgroundColor: "#000000",
    },
    features: ["Price Tickers", "Chart Integration", "Dark Mode", "Data Tables"],
  },

  // NEW THEMES

  aurora: {
    id: "aurora",
    name: "Aurora",
    description: "Dreamy pastel gradients with soft, ethereal aesthetics",
    category: "creative",
    defaultTokens: {
      primaryColor: "#a855f7",
      secondaryColor: "#ec4899",
      backgroundColor: "#fdf4ff",
      textColor: "#3b0764",
      headingFont: "elegant",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "glass",
      postCardHoverEffect: "glow",
      postCardImageRatio: "landscape",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "secondary",
      footerBackgroundColor: "#581c87",
    },
    features: ["Glass Cards", "Gradient Accents", "Soft Shadows", "Pastel Palette"],
  },

  carbon: {
    id: "carbon",
    name: "Carbon",
    description: "Bold brutalist design with stark contrasts",
    category: "creative",
    defaultTokens: {
      primaryColor: "#ffffff",
      secondaryColor: "#fbbf24",
      backgroundColor: "#18181b",
      textColor: "#e4e4e7",
      headingFont: "tech",
      bodyFont: "modern",
      cardStyle: "sharp",
      postCardStyle: "compact",
      postCardHoverEffect: "lift",
      postCardImageRatio: "wide",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "dark",
      footerBackgroundColor: "#09090b",
    },
    features: ["Brutalist Design", "High Contrast", "Sharp Edges", "Bold Typography"],
  },

  soho: {
    id: "soho",
    name: "Soho",
    description: "Sophisticated editorial style with premium serif typography",
    category: "news",
    defaultTokens: {
      primaryColor: "#1c1917",
      secondaryColor: "#b91c1c",
      backgroundColor: "#faf9f7",
      textColor: "#292524",
      headingFont: "editorial",
      bodyFont: "editorial",
      cardStyle: "borderless",
      postCardStyle: "editorial",
      postCardHoverEffect: "none",
      postCardImageRatio: "portrait",
      showFeaturedHero: true,
      contentWidth: "narrow",
      headerStyle: "minimal",
      footerColorMode: "light",
      footerBackgroundColor: "#f5f5f4",
    },
    features: ["Premium Typography", "Editorial Layout", "Classic Design", "Refined Spacing"],
  },

  citrine: {
    id: "citrine",
    name: "Citrine",
    description: "Warm, energetic magazine style with golden accents",
    category: "blog",
    defaultTokens: {
      primaryColor: "#d97706",
      secondaryColor: "#0d9488",
      backgroundColor: "#fffef7",
      textColor: "#1c1917",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "featured",
      postCardHoverEffect: "lift",
      postCardImageRatio: "landscape",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "standard",
      footerColorMode: "primary",
      footerBackgroundColor: "#92400e",
    },
    features: ["Warm Palette", "Featured Cards", "Golden Accents", "Energetic Design"],
  },

  verve: {
    id: "verve",
    name: "Verve",
    description: "High-energy creative theme with vibrant gradients",
    category: "creative",
    defaultTokens: {
      primaryColor: "#8b5cf6",
      secondaryColor: "#06b6d4",
      backgroundColor: "#0c0a09",
      textColor: "#fafaf9",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "gradient",
      postCardHoverEffect: "tilt",
      postCardImageRatio: "square",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "dark",
      footerBackgroundColor: "#020617",
    },
    features: ["Gradient Cards", "Vibrant Colors", "Dynamic Hover", "Bold Energy"],
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "SaaS / Technical / Performance",
    category: "blog",
    defaultTokens: {
      primaryColor: "#171717",
      secondaryColor: "#525252",
      backgroundColor: "#ffffff",
      textColor: "#404040",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "borderless",
      postCardStyle: "minimal",
      postCardHoverEffect: "none",
      postCardImageRatio: "landscape",
      showFeaturedHero: false,
      contentWidth: "narrow",
      headerStyle: "minimal",
      footerColorMode: "light",
      footerBackgroundColor: "#fafafa",
    },
    features: ["Maximum Whitespace", "Clean Typography", "Distraction-Free", "Focus on Content"],
  },

  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Calming blue tones inspired by the sea",
    category: "blog",
    defaultTokens: {
      primaryColor: "#0891b2",
      secondaryColor: "#0ea5e9",
      backgroundColor: "#f0fdff",
      textColor: "#164e63",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "standard",
      postCardHoverEffect: "lift",
      postCardImageRatio: "landscape",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "primary",
      footerBackgroundColor: "#0e7490",
    },
    features: ["Calming Colors", "Ocean Palette", "Relaxing Design", "Smooth Transitions"],
  },

  forest: {
    id: "forest",
    name: "Forest",
    description: "Natural green tones with organic feel",
    category: "blog",
    defaultTokens: {
      primaryColor: "#059669",
      secondaryColor: "#84cc16",
      backgroundColor: "#f7fdf7",
      textColor: "#14532d",
      headingFont: "elegant",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "overlay",
      postCardHoverEffect: "zoom",
      postCardImageRatio: "landscape",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "primary",
      footerBackgroundColor: "#166534",
    },
    features: ["Nature Inspired", "Green Palette", "Organic Feel", "Earthy Tones"],
  },
};

export function getThemeDefinition(themeId: string): ThemeDefinition | undefined {
  return themeRegistry[themeId];
}

export function getThemeDefaultTokens(themeId: string): Partial<TemplateSettings> {
  return themeRegistry[themeId]?.defaultTokens || {};
}

export const enabledThemeIds = new Set(["forbis", "magazine", "minimal", "portfolio"]);

export function getAllThemes(): ThemeDefinition[] {
  return Object.values(themeRegistry).filter(theme => enabledThemeIds.has(theme.id));
}

export function getThemesByCategory(category: ThemeDefinition["category"]): ThemeDefinition[] {
  return getAllThemes().filter(theme => theme.category === category);
}

export function mergeThemeTokens(
  themeId: string,
  customSettings: Partial<TemplateSettings>
): TemplateSettings {
  const themeDefaults = getThemeDefaultTokens(themeId);
  
  return {
    ...defaultTemplateSettings,
    ...themeDefaults,
    ...customSettings,
  };
}

export const themeCategories = [
  { id: "blog", label: "Blog", description: "Personal blogs and content sites" },
  { id: "news", label: "News", description: "News and media publications" },
  { id: "business", label: "Business", description: "Corporate and professional sites" },
  { id: "creative", label: "Creative", description: "Art, design, and creative portfolios" },
] as const;

export type ThemeId = keyof typeof themeRegistry;

export function isValidTheme(id: string): id is ThemeId {
  return id in themeRegistry;
}

export function isThemeEnabled(id: string): id is ThemeId {
  return enabledThemeIds.has(id);
}
