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
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
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
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "full",
    },
    features: ["Breaking News Banner", "Section Grid", "Trending Sidebar", "Live Updates"],
  },
  
  magazine: {
    id: "magazine",
    name: "Magazine",
    description: "Elegant magazine-style layout with rich typography",
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
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "standard",
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
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "minimal",
    },
    features: ["Dark Mode", "Minimal Cards", "Focus Mode", "Code Highlighting"],
  },
  
  portfolio: {
    id: "portfolio",
    name: "Portfolio",
    description: "Clean portfolio layout for showcasing work",
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
      showFeaturedHero: false,
      contentWidth: "wide",
      headerStyle: "minimal",
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
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "full",
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
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
    },
    features: ["Price Tickers", "Chart Integration", "Dark Mode", "Data Tables"],
  },
};

export function getThemeDefinition(themeId: string): ThemeDefinition | undefined {
  return themeRegistry[themeId];
}

export function getThemeDefaultTokens(themeId: string): Partial<TemplateSettings> {
  return themeRegistry[themeId]?.defaultTokens || {};
}

export function getAllThemes(): ThemeDefinition[] {
  return Object.values(themeRegistry);
}

export function getThemesByCategory(category: ThemeDefinition["category"]): ThemeDefinition[] {
  return Object.values(themeRegistry).filter(theme => theme.category === category);
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
