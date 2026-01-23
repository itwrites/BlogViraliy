import type { ContentLanguage } from "@shared/schema";

export type SetState<T> = (value: T | ((prev: T) => T)) => void;

export type SiteDataState = {
  domain: string;
  domainAliases: string[];
  basePath: string;
  deploymentMode: "standalone" | "reverse_proxy";
  proxyVisitorHostname: string;
  title: string;
  logoUrl: string;
  logoTargetUrl: string;
  menuMode: "automatic" | "manual";
  siteType: string;
  postUrlFormat: "with-prefix" | "root";
  displayLanguage: ContentLanguage;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  favicon: string;
  analyticsId: string;
  businessDescription: string;
  targetAudience: string;
  brandVoice: string;
  valuePropositions: string;
  industry: string;
  competitors: string;
};

export type MenuItemDraft = {
  label: string;
  type: "url" | "tag_group";
  href: string;
  tagSlugs: string[];
  groupSlug: string;
  openInNewTab: boolean;
};

export type NewAuthorState = {
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  isDefault: boolean;
};

export type AiConfigState = {
  enabled: boolean;
  schedule: string;
  masterPrompt: string;
  keywords: string[];
  targetLanguage: string;
  defaultPostStatus?: "published" | "draft";
};

export type RssConfigState = {
  enabled: boolean;
  schedule: string;
  feedUrls: string[];
  articlesToFetch: number;
  targetLanguage: string;
  masterPrompt: string;
  pillarId: string;
  articleRole: string;
  defaultPostStatus?: "published" | "draft";
};
