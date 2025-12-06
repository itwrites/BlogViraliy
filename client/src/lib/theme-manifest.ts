import type { TemplateSettings, Post } from "@shared/schema";
import { defaultTemplateSettings } from "@shared/schema";

export type PostCardVariant = "standard" | "editorial" | "minimal" | "overlay" | "compact" | "featured" | "glass" | "gradient";
export type HeaderVariant = "minimal" | "centered" | "split" | "magazine" | "transparent";
export type FooterVariant = "minimal" | "standard" | "rich" | "centered";
export type LayoutVariant = "grid" | "list" | "masonry" | "featured-grid" | "magazine" | "minimal-list" | "bento" | "bbc-news";
export type PostDetailVariant = "standard" | "immersive" | "minimal" | "magazine" | "centered" | "wide";

export interface ThemeLayoutConfig {
  homeLayout: LayoutVariant;
  gridColumns: { mobile: number; tablet: number; desktop: number };
  showHeroSection: boolean;
  heroStyle: "full-width" | "contained" | "split" | "minimal" | "none";
  sidebarEnabled: boolean;
  sidebarPosition: "left" | "right";
  contentMaxWidth: "narrow" | "medium" | "wide" | "full";
  sectionSpacing: "compact" | "normal" | "relaxed" | "spacious";
}

export interface ThemeCardConfig {
  primaryCardStyle: PostCardVariant;
  secondaryCardStyle: PostCardVariant;
  featuredCardStyle: PostCardVariant;
  showExcerpt: boolean;
  excerptLength: number;
  showReadingTime: boolean;
  showDate: boolean;
  showCategory: boolean;
  imageAspectRatio: "square" | "landscape" | "portrait" | "wide" | "auto";
  hoverEffect: "none" | "lift" | "zoom" | "glow" | "tilt" | "border";
}

export interface ThemePostDetailConfig {
  variant: PostDetailVariant;
  heroImageStyle: "full-bleed" | "contained" | "side" | "none";
  contentWidth: "narrow" | "medium" | "wide";
  showTableOfContents: boolean;
  tocPosition: "left" | "right" | "floating";
  showRelatedPosts: boolean;
  relatedPostsStyle: "cards" | "list" | "minimal";
  showAuthorBox: boolean;
  showShareButtons: boolean;
  typographyScale: "compact" | "normal" | "spacious";
}

export interface ThemeHeaderConfig {
  variant: HeaderVariant;
  sticky: boolean;
  showSearch: boolean;
  menuStyle: "horizontal" | "dropdown" | "mega-menu";
  logoPosition: "left" | "center";
  ctaButton: boolean;
  backgroundStyle: "solid" | "transparent" | "blur";
}

export interface ThemeFooterConfig {
  variant: FooterVariant;
  showNewsletter: boolean;
  showSocialLinks: boolean;
  showTagCloud: boolean;
  columns: number;
}

export interface ThemeTypographyConfig {
  headingWeight: "normal" | "medium" | "semibold" | "bold" | "black";
  bodyLineHeight: "tight" | "normal" | "relaxed";
  headingTracking: "tight" | "normal" | "wide";
  titleSize: "sm" | "md" | "lg" | "xl";
}

export interface ThemeAnimationConfig {
  pageTransition: boolean;
  cardEntrance: "none" | "fade" | "slide" | "scale" | "stagger";
  hoverAnimations: boolean;
  scrollAnimations: boolean;
  transitionDuration: number;
}

export interface ThemeColorTokens {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor?: string;
}

export interface ThemeManifest {
  id: string;
  name: string;
  description: string;
  category: "blog" | "news" | "business" | "creative";
  preview?: string;
  
  layout: ThemeLayoutConfig;
  cards: ThemeCardConfig;
  postDetail: ThemePostDetailConfig;
  header: ThemeHeaderConfig;
  footer: ThemeFooterConfig;
  typography: ThemeTypographyConfig;
  animation: ThemeAnimationConfig;
  colors: ThemeColorTokens;
  
  defaultTemplateSettings: Partial<TemplateSettings>;
  
  features: string[];
}

const baseDefaults = {
  layout: {
    homeLayout: "grid" as LayoutVariant,
    gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
    showHeroSection: true,
    heroStyle: "contained" as const,
    sidebarEnabled: false,
    sidebarPosition: "right" as const,
    contentMaxWidth: "medium" as const,
    sectionSpacing: "normal" as const,
  },
  cards: {
    primaryCardStyle: "standard" as PostCardVariant,
    secondaryCardStyle: "standard" as PostCardVariant,
    featuredCardStyle: "featured" as PostCardVariant,
    showExcerpt: true,
    excerptLength: 120,
    showReadingTime: true,
    showDate: true,
    showCategory: true,
    imageAspectRatio: "landscape" as const,
    hoverEffect: "lift" as const,
  },
  postDetail: {
    variant: "standard" as PostDetailVariant,
    heroImageStyle: "full-bleed" as const,
    contentWidth: "medium" as const,
    showTableOfContents: false,
    tocPosition: "right" as const,
    showRelatedPosts: true,
    relatedPostsStyle: "cards" as const,
    showAuthorBox: false,
    showShareButtons: false,
    typographyScale: "normal" as const,
  },
  header: {
    variant: "minimal" as HeaderVariant,
    sticky: true,
    showSearch: true,
    menuStyle: "horizontal" as const,
    logoPosition: "left" as const,
    ctaButton: false,
    backgroundStyle: "solid" as const,
  },
  footer: {
    variant: "standard" as FooterVariant,
    showNewsletter: false,
    showSocialLinks: true,
    showTagCloud: true,
    columns: 3,
  },
  typography: {
    headingWeight: "bold" as const,
    bodyLineHeight: "relaxed" as const,
    headingTracking: "tight" as const,
    titleSize: "lg" as const,
  },
  animation: {
    pageTransition: true,
    cardEntrance: "fade" as const,
    hoverAnimations: true,
    scrollAnimations: false,
    transitionDuration: 300,
  },
};

export const themeManifests: Record<string, ThemeManifest> = {
  novapress: {
    id: "novapress",
    name: "NovaPress",
    description: "Ultra-minimalist, sophisticated editorial experience with centered layouts and refined typography",
    category: "creative",
    layout: {
      homeLayout: "minimal-list",
      gridColumns: { mobile: 1, tablet: 1, desktop: 1 },
      showHeroSection: false,
      heroStyle: "none",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "narrow",
      sectionSpacing: "spacious",
    },
    cards: {
      primaryCardStyle: "minimal",
      secondaryCardStyle: "minimal",
      featuredCardStyle: "minimal",
      showExcerpt: true,
      excerptLength: 160,
      showReadingTime: true,
      showDate: true,
      showCategory: false,
      imageAspectRatio: "wide",
      hoverEffect: "none",
    },
    postDetail: {
      variant: "centered",
      heroImageStyle: "contained",
      contentWidth: "narrow",
      showTableOfContents: false,
      tocPosition: "floating",
      showRelatedPosts: true,
      relatedPostsStyle: "minimal",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "spacious",
    },
    header: {
      variant: "centered",
      sticky: true,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "center",
      ctaButton: false,
      backgroundStyle: "transparent",
    },
    footer: {
      variant: "minimal",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 1,
    },
    typography: {
      headingWeight: "medium",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "xl",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: false,
      scrollAnimations: false,
      transitionDuration: 400,
    },
    colors: {
      primaryColor: "#171717",
      secondaryColor: "#525252",
      backgroundColor: "#fafafa",
      textColor: "#262626",
    },
    defaultTemplateSettings: {
      primaryColor: "#171717",
      secondaryColor: "#525252",
      backgroundColor: "#fafafa",
      textColor: "#262626",
      headingFont: "editorial",
      bodyFont: "editorial",
      cardStyle: "borderless",
      postCardStyle: "minimal",
      postCardHoverEffect: "none",
      showFeaturedHero: false,
      contentWidth: "narrow",
      headerStyle: "minimal",
      footerColorMode: "light",
    },
    features: ["Centered Layout", "Minimal Cards", "Sophisticated Typography", "No Distractions"],
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Maximum whitespace, zero distractions, pure content focus",
    category: "blog",
    layout: {
      homeLayout: "minimal-list",
      gridColumns: { mobile: 1, tablet: 1, desktop: 1 },
      showHeroSection: false,
      heroStyle: "none",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "narrow",
      sectionSpacing: "spacious",
    },
    cards: {
      primaryCardStyle: "minimal",
      secondaryCardStyle: "minimal",
      featuredCardStyle: "minimal",
      showExcerpt: true,
      excerptLength: 200,
      showReadingTime: true,
      showDate: true,
      showCategory: false,
      imageAspectRatio: "landscape",
      hoverEffect: "none",
    },
    postDetail: {
      variant: "minimal",
      heroImageStyle: "none",
      contentWidth: "narrow",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: false,
      relatedPostsStyle: "minimal",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "spacious",
    },
    header: {
      variant: "minimal",
      sticky: false,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "transparent",
    },
    footer: {
      variant: "minimal",
      showNewsletter: false,
      showSocialLinks: false,
      showTagCloud: false,
      columns: 1,
    },
    typography: {
      headingWeight: "normal",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "lg",
    },
    animation: {
      pageTransition: false,
      cardEntrance: "none",
      hoverAnimations: false,
      scrollAnimations: false,
      transitionDuration: 200,
    },
    colors: {
      primaryColor: "#171717",
      secondaryColor: "#525252",
      backgroundColor: "#ffffff",
      textColor: "#404040",
    },
    defaultTemplateSettings: {
      primaryColor: "#171717",
      secondaryColor: "#525252",
      backgroundColor: "#ffffff",
      textColor: "#404040",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "borderless",
      postCardStyle: "minimal",
      postCardHoverEffect: "none",
      showFeaturedHero: false,
      contentWidth: "narrow",
      headerStyle: "minimal",
      footerColorMode: "light",
    },
    features: ["Maximum Whitespace", "No Images", "Pure Text", "Distraction-Free"],
  },

  magazine: {
    id: "magazine",
    name: "Magazine",
    description: "Rich editorial experience with multi-column layouts and bold imagery",
    category: "creative",
    layout: {
      homeLayout: "magazine",
      gridColumns: { mobile: 1, tablet: 2, desktop: 4 },
      showHeroSection: true,
      heroStyle: "full-width",
      sidebarEnabled: true,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "normal",
    },
    cards: {
      primaryCardStyle: "overlay",
      secondaryCardStyle: "editorial",
      featuredCardStyle: "overlay",
      showExcerpt: true,
      excerptLength: 100,
      showReadingTime: false,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "portrait",
      hoverEffect: "zoom",
    },
    postDetail: {
      variant: "magazine",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: true,
      tocPosition: "left",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: true,
      showShareButtons: true,
      typographyScale: "normal",
    },
    header: {
      variant: "magazine",
      sticky: true,
      showSearch: true,
      menuStyle: "mega-menu",
      logoPosition: "center",
      ctaButton: false,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "rich",
      showNewsletter: true,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 4,
    },
    typography: {
      headingWeight: "bold",
      bodyLineHeight: "relaxed",
      headingTracking: "tight",
      titleSize: "xl",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "stagger",
      hoverAnimations: true,
      scrollAnimations: true,
      transitionDuration: 350,
    },
    colors: {
      primaryColor: "#7c3aed",
      secondaryColor: "#db2777",
      backgroundColor: "#fafafa",
      textColor: "#1f2937",
    },
    defaultTemplateSettings: {
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
    features: ["Cover Stories", "Multi-Column", "Author Profiles", "Rich Media"],
  },

  news: {
    id: "news",
    name: "News",
    description: "BBC-style news layout with asymmetric 3-column grid, hero stories, and compact headlines",
    category: "news",
    layout: {
      homeLayout: "bbc-news",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "split",
      sidebarEnabled: true,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "compact",
    },
    cards: {
      primaryCardStyle: "compact",
      secondaryCardStyle: "compact",
      featuredCardStyle: "editorial",
      showExcerpt: true,
      excerptLength: 120,
      showReadingTime: false,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "none",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "contained",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "list",
      showAuthorBox: true,
      showShareButtons: true,
      typographyScale: "compact",
    },
    header: {
      variant: "centered",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "center",
      ctaButton: false,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "standard",
      showNewsletter: true,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 4,
    },
    typography: {
      headingWeight: "bold",
      bodyLineHeight: "normal",
      headingTracking: "tight",
      titleSize: "md",
    },
    animation: {
      pageTransition: false,
      cardEntrance: "fade",
      hoverAnimations: false,
      scrollAnimations: false,
      transitionDuration: 150,
    },
    colors: {
      primaryColor: "#bb1919",
      secondaryColor: "#3a3a3a",
      backgroundColor: "#ffffff",
      textColor: "#1a1a1a",
    },
    defaultTemplateSettings: {
      primaryColor: "#bb1919",
      secondaryColor: "#3a3a3a",
      backgroundColor: "#ffffff",
      textColor: "#1a1a1a",
      headingFont: "editorial",
      bodyFont: "modern",
      cardStyle: "borderless",
      postCardStyle: "compact",
      postCardHoverEffect: "none",
      showFeaturedHero: false,
      contentWidth: "wide",
      headerStyle: "standard",
      footerColorMode: "dark",
    },
    features: ["BBC-Style Layout", "Asymmetric Grid", "Relative Timestamps", "Category Tags", "Breaking News"],
  },

  blog: {
    id: "blog",
    name: "Blog",
    description: "Classic blog layout with featured hero and clean grid",
    category: "blog",
    layout: {
      homeLayout: "grid",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "contained",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "medium",
      sectionSpacing: "normal",
    },
    cards: {
      primaryCardStyle: "standard",
      secondaryCardStyle: "standard",
      featuredCardStyle: "featured",
      showExcerpt: true,
      excerptLength: 120,
      showReadingTime: true,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "lift",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "standard",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 3,
    },
    typography: {
      headingWeight: "semibold",
      bodyLineHeight: "relaxed",
      headingTracking: "tight",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 300,
    },
    colors: {
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
    },
    defaultTemplateSettings: {
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

  carbon: {
    id: "carbon",
    name: "Carbon",
    description: "Bold brutalist design with sharp edges and high contrast",
    category: "creative",
    layout: {
      homeLayout: "bento",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "full-width",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "compact",
    },
    cards: {
      primaryCardStyle: "compact",
      secondaryCardStyle: "compact",
      featuredCardStyle: "gradient",
      showExcerpt: false,
      excerptLength: 80,
      showReadingTime: false,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "wide",
      hoverEffect: "lift",
    },
    postDetail: {
      variant: "wide",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "minimal",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 1,
    },
    typography: {
      headingWeight: "black",
      bodyLineHeight: "normal",
      headingTracking: "tight",
      titleSize: "xl",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "scale",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 200,
    },
    colors: {
      primaryColor: "#ffffff",
      secondaryColor: "#fbbf24",
      backgroundColor: "#18181b",
      textColor: "#e4e4e7",
    },
    defaultTemplateSettings: {
      primaryColor: "#ffffff",
      secondaryColor: "#fbbf24",
      backgroundColor: "#18181b",
      textColor: "#e4e4e7",
      headingFont: "tech",
      bodyFont: "modern",
      cardStyle: "sharp",
      postCardStyle: "compact",
      postCardHoverEffect: "lift",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "dark",
    },
    features: ["Brutalist Design", "Sharp Edges", "Dark Mode", "Bold Typography"],
  },

  soho: {
    id: "soho",
    name: "Soho",
    description: "Sophisticated editorial elegance with premium typography",
    category: "news",
    layout: {
      homeLayout: "list",
      gridColumns: { mobile: 1, tablet: 1, desktop: 1 },
      showHeroSection: true,
      heroStyle: "minimal",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "narrow",
      sectionSpacing: "relaxed",
    },
    cards: {
      primaryCardStyle: "editorial",
      secondaryCardStyle: "editorial",
      featuredCardStyle: "editorial",
      showExcerpt: true,
      excerptLength: 180,
      showReadingTime: true,
      showDate: true,
      showCategory: false,
      imageAspectRatio: "portrait",
      hoverEffect: "none",
    },
    postDetail: {
      variant: "centered",
      heroImageStyle: "contained",
      contentWidth: "narrow",
      showTableOfContents: false,
      tocPosition: "left",
      showRelatedPosts: true,
      relatedPostsStyle: "minimal",
      showAuthorBox: true,
      showShareButtons: false,
      typographyScale: "spacious",
    },
    header: {
      variant: "centered",
      sticky: false,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "center",
      ctaButton: false,
      backgroundStyle: "transparent",
    },
    footer: {
      variant: "centered",
      showNewsletter: true,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 1,
    },
    typography: {
      headingWeight: "normal",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "xl",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: false,
      scrollAnimations: false,
      transitionDuration: 400,
    },
    colors: {
      primaryColor: "#1c1917",
      secondaryColor: "#b91c1c",
      backgroundColor: "#faf9f7",
      textColor: "#292524",
    },
    defaultTemplateSettings: {
      primaryColor: "#1c1917",
      secondaryColor: "#b91c1c",
      backgroundColor: "#faf9f7",
      textColor: "#292524",
      headingFont: "editorial",
      bodyFont: "editorial",
      cardStyle: "borderless",
      postCardStyle: "editorial",
      postCardHoverEffect: "none",
      showFeaturedHero: true,
      contentWidth: "narrow",
      headerStyle: "minimal",
      footerColorMode: "light",
    },
    features: ["Premium Typography", "Editorial Layout", "Serif Fonts", "Refined Spacing"],
  },

  aurora: {
    id: "aurora",
    name: "Aurora",
    description: "Dreamy pastel gradients with ethereal aesthetics",
    category: "creative",
    layout: {
      homeLayout: "grid",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "contained",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "medium",
      sectionSpacing: "relaxed",
    },
    cards: {
      primaryCardStyle: "glass",
      secondaryCardStyle: "glass",
      featuredCardStyle: "glass",
      showExcerpt: true,
      excerptLength: 120,
      showReadingTime: true,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "glow",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "contained",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "blur",
    },
    footer: {
      variant: "standard",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 3,
    },
    typography: {
      headingWeight: "semibold",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 350,
    },
    colors: {
      primaryColor: "#a855f7",
      secondaryColor: "#ec4899",
      backgroundColor: "#fdf4ff",
      textColor: "#3b0764",
    },
    defaultTemplateSettings: {
      primaryColor: "#a855f7",
      secondaryColor: "#ec4899",
      backgroundColor: "#fdf4ff",
      textColor: "#3b0764",
      headingFont: "elegant",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "glass",
      postCardHoverEffect: "glow",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "secondary",
    },
    features: ["Glass Cards", "Pastel Gradients", "Soft Shadows", "Ethereal Feel"],
  },

  verve: {
    id: "verve",
    name: "Verve",
    description: "High-energy creative theme with vibrant gradients",
    category: "creative",
    layout: {
      homeLayout: "bento",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "full-width",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "normal",
    },
    cards: {
      primaryCardStyle: "gradient",
      secondaryCardStyle: "gradient",
      featuredCardStyle: "gradient",
      showExcerpt: true,
      excerptLength: 100,
      showReadingTime: false,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "square",
      hoverEffect: "tilt",
    },
    postDetail: {
      variant: "immersive",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: true,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "transparent",
    },
    footer: {
      variant: "minimal",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 1,
    },
    typography: {
      headingWeight: "bold",
      bodyLineHeight: "normal",
      headingTracking: "tight",
      titleSize: "xl",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "scale",
      hoverAnimations: true,
      scrollAnimations: true,
      transitionDuration: 300,
    },
    colors: {
      primaryColor: "#8b5cf6",
      secondaryColor: "#06b6d4",
      backgroundColor: "#0c0a09",
      textColor: "#fafaf9",
    },
    defaultTemplateSettings: {
      primaryColor: "#8b5cf6",
      secondaryColor: "#06b6d4",
      backgroundColor: "#0c0a09",
      textColor: "#fafaf9",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "gradient",
      postCardHoverEffect: "tilt",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "dark",
    },
    features: ["Gradient Cards", "Vibrant Colors", "Tilt Hover", "Bold Energy"],
  },

  citrine: {
    id: "citrine",
    name: "Citrine",
    description: "Warm golden accents with energetic magazine style",
    category: "blog",
    layout: {
      homeLayout: "featured-grid",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "split",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "normal",
    },
    cards: {
      primaryCardStyle: "featured",
      secondaryCardStyle: "standard",
      featuredCardStyle: "featured",
      showExcerpt: true,
      excerptLength: 120,
      showReadingTime: true,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "lift",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: true,
      showShareButtons: true,
      typographyScale: "normal",
    },
    header: {
      variant: "split",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "standard",
      showNewsletter: true,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 3,
    },
    typography: {
      headingWeight: "bold",
      bodyLineHeight: "relaxed",
      headingTracking: "tight",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "stagger",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 300,
    },
    colors: {
      primaryColor: "#d97706",
      secondaryColor: "#0d9488",
      backgroundColor: "#fffef7",
      textColor: "#1c1917",
    },
    defaultTemplateSettings: {
      primaryColor: "#d97706",
      secondaryColor: "#0d9488",
      backgroundColor: "#fffef7",
      textColor: "#1c1917",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "featured",
      postCardHoverEffect: "lift",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "standard",
      footerColorMode: "primary",
    },
    features: ["Warm Palette", "Featured Cards", "Golden Accents", "Energetic"],
  },

  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Calming blue tones inspired by the sea",
    category: "blog",
    layout: {
      homeLayout: "grid",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "contained",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "medium",
      sectionSpacing: "relaxed",
    },
    cards: {
      primaryCardStyle: "standard",
      secondaryCardStyle: "standard",
      featuredCardStyle: "featured",
      showExcerpt: true,
      excerptLength: 140,
      showReadingTime: true,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "lift",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "contained",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "blur",
    },
    footer: {
      variant: "standard",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 3,
    },
    typography: {
      headingWeight: "semibold",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 350,
    },
    colors: {
      primaryColor: "#0891b2",
      secondaryColor: "#0ea5e9",
      backgroundColor: "#f0fdff",
      textColor: "#164e63",
    },
    defaultTemplateSettings: {
      primaryColor: "#0891b2",
      secondaryColor: "#0ea5e9",
      backgroundColor: "#f0fdff",
      textColor: "#164e63",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "standard",
      postCardHoverEffect: "lift",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "primary",
    },
    features: ["Calming Colors", "Ocean Palette", "Smooth Transitions", "Relaxing"],
  },

  forest: {
    id: "forest",
    name: "Forest",
    description: "Natural green tones with organic, earthy feel",
    category: "blog",
    layout: {
      homeLayout: "grid",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "contained",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "medium",
      sectionSpacing: "normal",
    },
    cards: {
      primaryCardStyle: "overlay",
      secondaryCardStyle: "standard",
      featuredCardStyle: "overlay",
      showExcerpt: true,
      excerptLength: 120,
      showReadingTime: true,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "zoom",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: false,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "standard",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: true,
      columns: 3,
    },
    typography: {
      headingWeight: "semibold",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 300,
    },
    colors: {
      primaryColor: "#059669",
      secondaryColor: "#84cc16",
      backgroundColor: "#f7fdf7",
      textColor: "#14532d",
    },
    defaultTemplateSettings: {
      primaryColor: "#059669",
      secondaryColor: "#84cc16",
      backgroundColor: "#f7fdf7",
      textColor: "#14532d",
      headingFont: "elegant",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "overlay",
      postCardHoverEffect: "zoom",
      showFeaturedHero: true,
      contentWidth: "medium",
      headerStyle: "standard",
      footerColorMode: "primary",
    },
    features: ["Nature Palette", "Organic Feel", "Earthy Tones", "Natural"],
  },

  portfolio: {
    id: "portfolio",
    name: "Portfolio",
    description: "Clean showcase layout for projects and work",
    category: "business",
    layout: {
      homeLayout: "masonry",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: false,
      heroStyle: "none",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "relaxed",
    },
    cards: {
      primaryCardStyle: "overlay",
      secondaryCardStyle: "overlay",
      featuredCardStyle: "overlay",
      showExcerpt: false,
      excerptLength: 80,
      showReadingTime: false,
      showDate: false,
      showCategory: true,
      imageAspectRatio: "auto",
      hoverEffect: "zoom",
    },
    postDetail: {
      variant: "wide",
      heroImageStyle: "full-bleed",
      contentWidth: "wide",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: false,
      typographyScale: "normal",
    },
    header: {
      variant: "minimal",
      sticky: true,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: true,
      backgroundStyle: "transparent",
    },
    footer: {
      variant: "minimal",
      showNewsletter: false,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 1,
    },
    typography: {
      headingWeight: "medium",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "scale",
      hoverAnimations: true,
      scrollAnimations: true,
      transitionDuration: 350,
    },
    colors: {
      primaryColor: "#10b981",
      secondaryColor: "#6366f1",
      backgroundColor: "#ffffff",
      textColor: "#374151",
    },
    defaultTemplateSettings: {
      primaryColor: "#10b981",
      secondaryColor: "#6366f1",
      backgroundColor: "#ffffff",
      textColor: "#374151",
      headingFont: "modern",
      bodyFont: "modern",
      cardStyle: "rounded",
      postCardStyle: "overlay",
      postCardHoverEffect: "zoom",
      showFeaturedHero: false,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "light",
    },
    features: ["Project Grid", "Case Studies", "Image Focus", "Clean Design"],
  },

  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    description: "Warm hospitality theme for food and dining",
    category: "business",
    layout: {
      homeLayout: "grid",
      gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
      showHeroSection: true,
      heroStyle: "full-width",
      sidebarEnabled: false,
      sidebarPosition: "right",
      contentMaxWidth: "medium",
      sectionSpacing: "normal",
    },
    cards: {
      primaryCardStyle: "overlay",
      secondaryCardStyle: "overlay",
      featuredCardStyle: "overlay",
      showExcerpt: true,
      excerptLength: 100,
      showReadingTime: false,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "square",
      hoverEffect: "zoom",
    },
    postDetail: {
      variant: "immersive",
      heroImageStyle: "full-bleed",
      contentWidth: "medium",
      showTableOfContents: false,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "cards",
      showAuthorBox: false,
      showShareButtons: true,
      typographyScale: "normal",
    },
    header: {
      variant: "centered",
      sticky: true,
      showSearch: false,
      menuStyle: "horizontal",
      logoPosition: "center",
      ctaButton: true,
      backgroundStyle: "solid",
    },
    footer: {
      variant: "rich",
      showNewsletter: true,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 3,
    },
    typography: {
      headingWeight: "bold",
      bodyLineHeight: "relaxed",
      headingTracking: "normal",
      titleSize: "lg",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 300,
    },
    colors: {
      primaryColor: "#b45309",
      secondaryColor: "#059669",
      backgroundColor: "#fffbeb",
      textColor: "#451a03",
    },
    defaultTemplateSettings: {
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
    features: ["Menu Cards", "Warm Colors", "Gallery Focus", "Reservation CTA"],
  },

  crypto: {
    id: "crypto",
    name: "Crypto",
    description: "Modern fintech aesthetic with dark theme",
    category: "business",
    layout: {
      homeLayout: "bento",
      gridColumns: { mobile: 1, tablet: 2, desktop: 4 },
      showHeroSection: true,
      heroStyle: "contained",
      sidebarEnabled: true,
      sidebarPosition: "right",
      contentMaxWidth: "wide",
      sectionSpacing: "compact",
    },
    cards: {
      primaryCardStyle: "compact",
      secondaryCardStyle: "minimal",
      featuredCardStyle: "glass",
      showExcerpt: false,
      excerptLength: 80,
      showReadingTime: false,
      showDate: true,
      showCategory: true,
      imageAspectRatio: "landscape",
      hoverEffect: "glow",
    },
    postDetail: {
      variant: "standard",
      heroImageStyle: "contained",
      contentWidth: "medium",
      showTableOfContents: true,
      tocPosition: "right",
      showRelatedPosts: true,
      relatedPostsStyle: "list",
      showAuthorBox: false,
      showShareButtons: true,
      typographyScale: "compact",
    },
    header: {
      variant: "split",
      sticky: true,
      showSearch: true,
      menuStyle: "horizontal",
      logoPosition: "left",
      ctaButton: true,
      backgroundStyle: "blur",
    },
    footer: {
      variant: "standard",
      showNewsletter: true,
      showSocialLinks: true,
      showTagCloud: false,
      columns: 4,
    },
    typography: {
      headingWeight: "semibold",
      bodyLineHeight: "normal",
      headingTracking: "tight",
      titleSize: "md",
    },
    animation: {
      pageTransition: true,
      cardEntrance: "fade",
      hoverAnimations: true,
      scrollAnimations: false,
      transitionDuration: 250,
    },
    colors: {
      primaryColor: "#22c55e",
      secondaryColor: "#eab308",
      backgroundColor: "#09090b",
      textColor: "#fafafa",
    },
    defaultTemplateSettings: {
      primaryColor: "#22c55e",
      secondaryColor: "#eab308",
      backgroundColor: "#09090b",
      textColor: "#fafafa",
      headingFont: "tech",
      bodyFont: "modern",
      cardStyle: "sharp",
      postCardStyle: "compact",
      postCardHoverEffect: "glow",
      showFeaturedHero: true,
      contentWidth: "wide",
      headerStyle: "minimal",
      footerColorMode: "dark",
    },
    features: ["Dark Mode", "Data Focus", "Tech Aesthetic", "Fintech Style"],
  },
};

export function getThemeManifest(themeId: string): ThemeManifest | undefined {
  return themeManifests[themeId];
}

export function getAllThemeManifests(): ThemeManifest[] {
  return Object.values(themeManifests);
}

export function getThemesByCategory(category: ThemeManifest["category"]): ThemeManifest[] {
  return Object.values(themeManifests).filter(theme => theme.category === category);
}

export function isValidThemeManifest(id: string): boolean {
  return id in themeManifests;
}

export function getLayoutClasses(manifest: ThemeManifest): {
  gridClass: string;
  contentWidthClass: string;
  spacingClass: string;
} {
  const { layout } = manifest;
  
  const gridCols = {
    mobile: layout.gridColumns.mobile,
    tablet: layout.gridColumns.tablet,
    desktop: layout.gridColumns.desktop,
  };
  
  const gridClass = `grid grid-cols-${gridCols.mobile} md:grid-cols-${gridCols.tablet} lg:grid-cols-${gridCols.desktop}`;
  
  const contentWidthMap = {
    narrow: "max-w-3xl",
    medium: "max-w-5xl",
    wide: "max-w-7xl",
    full: "max-w-full",
  };
  
  const spacingMap = {
    compact: "gap-3",
    normal: "gap-4 md:gap-6",
    relaxed: "gap-6 md:gap-8",
    spacious: "gap-8 md:gap-12",
  };
  
  return {
    gridClass,
    contentWidthClass: contentWidthMap[layout.contentMaxWidth],
    spacingClass: spacingMap[layout.sectionSpacing],
  };
}

export function getTypographyClasses(manifest: ThemeManifest): {
  headingClass: string;
  bodyClass: string;
  titleSizeClass: string;
} {
  const { typography } = manifest;
  
  const weightMap = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    black: "font-black",
  };
  
  const lineHeightMap = {
    tight: "leading-tight",
    normal: "leading-normal",
    relaxed: "leading-relaxed",
  };
  
  const trackingMap = {
    tight: "tracking-tight",
    normal: "tracking-normal",
    wide: "tracking-wide",
  };
  
  const titleSizeMap = {
    sm: "text-xl md:text-2xl",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
    xl: "text-4xl md:text-5xl",
  };
  
  return {
    headingClass: `${weightMap[typography.headingWeight]} ${trackingMap[typography.headingTracking]}`,
    bodyClass: lineHeightMap[typography.bodyLineHeight],
    titleSizeClass: titleSizeMap[typography.titleSize],
  };
}
