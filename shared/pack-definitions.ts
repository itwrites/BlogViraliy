import type { PackType, ArticleRole } from "./schema";
import { articleRoleDisplayNames } from "./schema";

export type { PackType, ArticleRole };

export const ARTICLE_ROLES: { id: ArticleRole; label: string }[] = Object.entries(articleRoleDisplayNames).map(
  ([id, label]) => ({ id: id as ArticleRole, label })
);

export type AnchorPattern = "exact" | "partial" | "semantic" | "action" | "list";

export interface LinkingRule {
  fromRole: ArticleRole;
  toRoles: ArticleRole[];
  anchorPattern: AnchorPattern;
  priority: number;
}

export interface PackDefinition {
  id: PackType;
  name: string;
  description: string;
  allowedRoles: ArticleRole[];
  linkingRules: LinkingRule[];
  defaultRoleDistribution: { role: ArticleRole; percentage: number }[];
}

export interface CustomPackConfig {
  name: string;
  description: string;
  allowedRoles: ArticleRole[];
  linkingRules: LinkingRule[];
  roleDistribution: { role: ArticleRole; percentage: number }[];
}

export interface JsonLdSchemaConfig {
  schemaType: string;
  requiredFields: string[];
  optionalFields: string[];
  description: string;
}

export const anchorPatternDescriptions: Record<LinkingRule["anchorPattern"], string> = {
  exact: "Exact phrase link text (e.g., 'best coffee makers')",
  partial: "Partial phrase link text (e.g., 'top-rated coffee makers')",
  semantic: "Related link text (e.g., 'brewing equipment guide')",
  action: "Action-oriented link text (e.g., 'compare prices')",
  list: "List-style link text (e.g., 'see our top picks')",
};

export const packDefinitions: Record<PackType, PackDefinition> = {
  quick_seo: {
    id: "quick_seo",
    name: "Fast Visibility",
    description: "Rapid authority launch centered on a core authority page with supporting assets.",
    allowedRoles: ["pillar", "support", "how_to", "faq", "general"],
    linkingRules: [
      { fromRole: "support", toRoles: ["pillar"], anchorPattern: "exact", priority: 1 },
      { fromRole: "how_to", toRoles: ["pillar"], anchorPattern: "partial", priority: 1 },
      { fromRole: "faq", toRoles: ["pillar"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "general", toRoles: ["pillar"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "pillar", toRoles: ["support", "how_to", "faq"], anchorPattern: "semantic", priority: 2 },
    ],
    defaultRoleDistribution: [
      { role: "pillar", percentage: 5 },
      { role: "support", percentage: 50 },
      { role: "how_to", percentage: 25 },
      { role: "faq", percentage: 15 },
      { role: "general", percentage: 5 },
    ],
  },

  traffic_boost: {
    id: "traffic_boost",
    name: "Traffic Accelerator",
    description: "Opportunity pages feed comparison and buyer guides to expand discovery.",
    allowedRoles: ["pillar", "long_tail", "rankings", "best_of", "listicle", "general"],
    linkingRules: [
      { fromRole: "long_tail", toRoles: ["rankings"], anchorPattern: "partial", priority: 1 },
      { fromRole: "long_tail", toRoles: ["pillar"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "rankings", toRoles: ["best_of"], anchorPattern: "list", priority: 1 },
      { fromRole: "rankings", toRoles: ["pillar"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "best_of", toRoles: ["pillar"], anchorPattern: "exact", priority: 1 },
      { fromRole: "listicle", toRoles: ["rankings", "best_of"], anchorPattern: "list", priority: 1 },
      { fromRole: "pillar", toRoles: ["rankings", "best_of"], anchorPattern: "semantic", priority: 2 },
    ],
    defaultRoleDistribution: [
      { role: "pillar", percentage: 5 },
      { role: "long_tail", percentage: 50 },
      { role: "rankings", percentage: 25 },
      { role: "best_of", percentage: 10 },
      { role: "listicle", percentage: 10 },
    ],
  },

  buyer_intent: {
    id: "buyer_intent",
    name: "Revenue Focus",
    description: "Head-to-head comparisons feed product reviews and landing pages for higher conversion.",
    allowedRoles: ["pillar", "comparison", "review", "conversion", "how_to", "general"],
    linkingRules: [
      { fromRole: "comparison", toRoles: ["review"], anchorPattern: "partial", priority: 1 },
      { fromRole: "comparison", toRoles: ["pillar"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "review", toRoles: ["conversion"], anchorPattern: "action", priority: 1 },
      { fromRole: "review", toRoles: ["pillar"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "conversion", toRoles: ["pillar"], anchorPattern: "exact", priority: 1 },
      { fromRole: "how_to", toRoles: ["review", "comparison"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "pillar", toRoles: ["comparison", "review"], anchorPattern: "semantic", priority: 2 },
    ],
    defaultRoleDistribution: [
      { role: "pillar", percentage: 5 },
      { role: "comparison", percentage: 30 },
      { role: "review", percentage: 40 },
      { role: "conversion", percentage: 10 },
      { role: "how_to", percentage: 15 },
    ],
  },

  authority: {
    id: "authority",
    name: "Market Leadership",
    description: "Case studies and industry benchmarks elevate frameworks and whitepapers for credibility.",
    allowedRoles: ["pillar", "case_study", "benchmark", "framework", "whitepaper", "how_to", "general"],
    linkingRules: [
      { fromRole: "case_study", toRoles: ["framework"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "case_study", toRoles: ["pillar"], anchorPattern: "partial", priority: 2 },
      { fromRole: "benchmark", toRoles: ["framework", "whitepaper"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "benchmark", toRoles: ["pillar"], anchorPattern: "partial", priority: 2 },
      { fromRole: "framework", toRoles: ["whitepaper"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "framework", toRoles: ["pillar"], anchorPattern: "exact", priority: 2 },
      { fromRole: "whitepaper", toRoles: ["pillar"], anchorPattern: "exact", priority: 1 },
      { fromRole: "how_to", toRoles: ["framework", "case_study"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "pillar", toRoles: ["whitepaper", "framework"], anchorPattern: "semantic", priority: 2 },
    ],
    defaultRoleDistribution: [
      { role: "pillar", percentage: 5 },
      { role: "case_study", percentage: 30 },
      { role: "benchmark", percentage: 20 },
      { role: "framework", percentage: 25 },
      { role: "whitepaper", percentage: 10 },
      { role: "how_to", percentage: 10 },
    ],
  },

  full_coverage: {
    id: "full_coverage",
    name: "Total Market Coverage",
    description: "Full-spectrum coverage where every asset connects back to the core authority page.",
    allowedRoles: ["pillar", "support", "how_to", "faq", "listicle", "news", "general"],
    linkingRules: [
      { fromRole: "support", toRoles: ["pillar"], anchorPattern: "exact", priority: 1 },
      { fromRole: "support", toRoles: ["support"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "how_to", toRoles: ["pillar"], anchorPattern: "partial", priority: 1 },
      { fromRole: "how_to", toRoles: ["support", "faq"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "faq", toRoles: ["pillar"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "faq", toRoles: ["how_to", "support"], anchorPattern: "semantic", priority: 2 },
      { fromRole: "listicle", toRoles: ["pillar"], anchorPattern: "list", priority: 1 },
      { fromRole: "news", toRoles: ["pillar"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "general", toRoles: ["pillar"], anchorPattern: "semantic", priority: 1 },
      { fromRole: "pillar", toRoles: ["support", "how_to", "faq", "listicle"], anchorPattern: "semantic", priority: 2 },
    ],
    defaultRoleDistribution: [
      { role: "pillar", percentage: 5 },
      { role: "support", percentage: 35 },
      { role: "how_to", percentage: 25 },
      { role: "faq", percentage: 15 },
      { role: "listicle", percentage: 10 },
      { role: "news", percentage: 5 },
      { role: "general", percentage: 5 },
    ],
  },

  custom: {
    id: "custom",
    name: "Custom Strategy",
    description: "Design your own growth logic, asset mix, and automation behavior.",
    allowedRoles: [
      "pillar", "support", "long_tail", "rankings", "best_of",
      "comparison", "review", "conversion", "case_study", "benchmark",
      "framework", "whitepaper", "how_to", "faq", "listicle", "news", "general"
    ],
    linkingRules: [],
    defaultRoleDistribution: [
      { role: "pillar", percentage: 5 },
      { role: "support", percentage: 45 },
      { role: "general", percentage: 50 },
    ],
  },
};

export const articleRoleJsonLdSchemas: Record<ArticleRole, JsonLdSchemaConfig> = {
  pillar: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "dateModified", "publisher"],
    description: "Standard article schema for pillar content",
  },
  support: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "dateModified", "publisher"],
    description: "Standard article schema for supporting content",
  },
  long_tail: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "dateModified", "keywords"],
    description: "Article schema with keyword emphasis",
  },
  rankings: {
    schemaType: "ItemList",
    requiredFields: ["name", "description", "itemListElement"],
    optionalFields: ["numberOfItems", "itemListOrder"],
    description: "ItemList schema for ranking/top 10 style content",
  },
  best_of: {
    schemaType: "ItemList",
    requiredFields: ["name", "description", "itemListElement"],
    optionalFields: ["numberOfItems", "itemListOrder", "datePublished"],
    description: "ItemList schema for best-of/roundup content",
  },
  comparison: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "about"],
    description: "Article schema with comparison subject metadata",
  },
  review: {
    schemaType: "Review",
    requiredFields: ["itemReviewed", "reviewRating", "author", "reviewBody"],
    optionalFields: ["datePublished", "publisher", "pros", "cons"],
    description: "Review schema with star ratings",
  },
  conversion: {
    schemaType: "Product",
    requiredFields: ["name", "description"],
    optionalFields: ["offers", "aggregateRating", "review", "brand"],
    description: "Product schema for conversion-focused pages",
  },
  case_study: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "about", "mentions"],
    description: "Article schema with case study metadata",
  },
  benchmark: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "about", "citation"],
    description: "Article schema for benchmark/statistics content",
  },
  framework: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "learningResourceType"],
    description: "Article schema for framework/methodology content",
  },
  whitepaper: {
    schemaType: "TechArticle",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "proficiencyLevel", "dependencies"],
    description: "TechArticle schema for whitepapers/guides",
  },
  how_to: {
    schemaType: "HowTo",
    requiredFields: ["name", "description", "step"],
    optionalFields: ["image", "totalTime", "estimatedCost", "supply", "tool"],
    description: "HowTo schema with step-by-step instructions",
  },
  faq: {
    schemaType: "FAQPage",
    requiredFields: ["mainEntity"],
    optionalFields: ["name", "description"],
    description: "FAQPage schema with question-answer pairs",
  },
  listicle: {
    schemaType: "ItemList",
    requiredFields: ["name", "description", "itemListElement"],
    optionalFields: ["numberOfItems", "itemListOrder"],
    description: "ItemList schema for list-based articles",
  },
  news: {
    schemaType: "NewsArticle",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "dateModified", "articleSection"],
    description: "NewsArticle schema for news/updates",
  },
  general: {
    schemaType: "Article",
    requiredFields: ["headline", "description", "author", "datePublished"],
    optionalFields: ["image", "dateModified", "publisher"],
    description: "Standard article schema for general content",
  },
};

export function getPackDefinition(packType: PackType): PackDefinition {
  return packDefinitions[packType] || packDefinitions.quick_seo;
}

export function getJsonLdSchemaConfig(articleRole: ArticleRole): JsonLdSchemaConfig {
  return articleRoleJsonLdSchemas[articleRole] || articleRoleJsonLdSchemas.general;
}

export function getLinkingRulesForRole(packType: PackType, fromRole: ArticleRole): LinkingRule[] {
  const pack = getPackDefinition(packType);
  return pack.linkingRules
    .filter(rule => rule.fromRole === fromRole)
    .sort((a, b) => a.priority - b.priority);
}

export function getTargetRolesForLinking(packType: PackType, fromRole: ArticleRole): ArticleRole[] {
  const rules = getLinkingRulesForRole(packType, fromRole);
  const targetRoles: ArticleRole[] = [];
  for (const rule of rules) {
    for (const toRole of rule.toRoles) {
      if (!targetRoles.includes(toRole)) {
        targetRoles.push(toRole);
      }
    }
  }
  return targetRoles;
}

export function getAnchorPatternForLink(packType: PackType, fromRole: ArticleRole, toRole: ArticleRole): LinkingRule["anchorPattern"] {
  const pack = getPackDefinition(packType);
  const rule = pack.linkingRules.find(r => r.fromRole === fromRole && r.toRoles.includes(toRole));
  return rule?.anchorPattern || "semantic";
}

export function isRoleAllowedInPack(packType: PackType, role: ArticleRole): boolean {
  const pack = getPackDefinition(packType);
  return pack.allowedRoles.includes(role);
}

export const PACK_DEFINITIONS = packDefinitions;

export interface RoleDistribution {
  role: ArticleRole;
  percentage: number;
}

export function getPackRoleDistribution(roles: RoleDistribution[]): ArticleRole[] {
  const distribution: ArticleRole[] = [];
  for (const { role, percentage } of roles) {
    const count = Math.ceil(percentage / 100 * 100);
    for (let i = 0; i < count; i++) {
      distribution.push(role);
    }
  }
  return distribution;
}

export function selectRoleForArticle(distribution: ArticleRole[], index: number): ArticleRole {
  if (distribution.length === 0) {
    return "general";
  }
  return distribution[index % distribution.length];
}
