import type { ArticleRole } from "@shared/schema";
import { getPackDefinition, type PackType, type AnchorPattern } from "@shared/pack-definitions";
import type { BusinessContext } from "./openai";

export interface RolePromptConfig {
  structureGuidelines: string;
  contentFocus: string;
  wordCountRange: { min: number; max: number };
  specialInstructions: string[];
}

const rolePromptConfigs: Record<ArticleRole, RolePromptConfig> = {
  pillar: {
    structureGuidelines: `
- Start with a comprehensive introduction defining the topic
- Use ## for 8-12 major sections covering all aspects
- Include a table of contents at the beginning
- End with a comprehensive summary/conclusion`,
    contentFocus: "Create the definitive, comprehensive guide on this topic. Cover all major aspects thoroughly.",
    wordCountRange: { min: 2500, max: 4000 },
    specialInstructions: [
      "This is the cornerstone content - make it authoritative and thorough",
      "Link to all category/cluster articles naturally within relevant sections",
      "Include statistics, expert insights, and actionable takeaways",
    ],
  },
  
  support: {
    structureGuidelines: `
- Clear introduction explaining the topic's importance
- Use ## for 4-6 key sections
- Include practical examples in each section
- End with key takeaways`,
    contentFocus: "Provide supporting information that complements the pillar content with deeper dives into specific aspects.",
    wordCountRange: { min: 1200, max: 2000 },
    specialInstructions: [
      "Reference and link to the pillar article for broader context",
      "Focus on practical, actionable information",
    ],
  },
  
  long_tail: {
    structureGuidelines: `
- Direct answer to the specific query in the introduction
- Use ## for 3-5 focused sections
- Include specific examples and use cases
- Quick summary at the end`,
    contentFocus: "Target a specific long-tail keyword with focused, in-depth content that directly answers user intent.",
    wordCountRange: { min: 800, max: 1500 },
    specialInstructions: [
      "Answer the specific question thoroughly",
      "Link to broader pillar/category content for related information",
      "Optimize heavily for the target long-tail keyword",
    ],
  },
  
  rankings: {
    structureGuidelines: `
- Introduction explaining ranking criteria
- Use ## for each ranked item with clear numbering (e.g., "## 1. [Item Name]")
- Include pros/cons for each item
- Comparison table if appropriate
- Conclusion with recommendations by use case`,
    contentFocus: "Create an authoritative ranking/top-N list with clear criteria and justifications.",
    wordCountRange: { min: 2000, max: 3500 },
    specialInstructions: [
      "Clearly state ranking methodology upfront",
      "Be objective and provide evidence for rankings",
      "Include an ItemList-friendly structure for rich snippets",
      "Link to individual review articles where available",
    ],
  },
  
  best_of: {
    structureGuidelines: `
- Quick intro with selection criteria
- Use ## for each recommended item
- Include key features, pricing, best for whom
- Quick comparison overview
- Final verdict/recommendations`,
    contentFocus: "Curate the best options in a category with clear recommendations for different needs.",
    wordCountRange: { min: 1500, max: 2500 },
    specialInstructions: [
      "Focus on helping readers make decisions",
      "Include affiliate-friendly product mentions",
      "Link to detailed reviews for each item",
    ],
  },
  
  comparison: {
    structureGuidelines: `
- Introduction framing the comparison
- ## Quick Comparison Table (feature matrix)
- ## Individual sections for each option
- ## Head-to-Head comparisons
- ## Final Verdict with recommendations`,
    contentFocus: "Create a balanced, thorough comparison helping readers choose between options.",
    wordCountRange: { min: 1800, max: 3000 },
    specialInstructions: [
      "Be fair and balanced - acknowledge pros/cons of each",
      "Include a comparison table early in the article",
      "End with clear recommendations based on use cases",
      "Link to individual review articles",
    ],
  },
  
  review: {
    structureGuidelines: `
- Quick verdict box at the top (rating, pros, cons)
- ## Overview / First Impressions
- ## Key Features (3-5 sections)
- ## Pros and Cons
- ## Pricing
- ## Who Should Use This
- ## Final Verdict with rating`,
    contentFocus: "Provide an honest, thorough review with a clear rating and verdict.",
    wordCountRange: { min: 1500, max: 2500 },
    specialInstructions: [
      "Include a numerical rating (X/10 or X/5)",
      "Be honest about limitations",
      "Structure for Review schema rich snippets",
      "Link to comparison and alternative articles",
    ],
  },
  
  conversion: {
    structureGuidelines: `
- Hook with the problem/pain point
- ## The Challenge/Problem
- ## The Solution
- ## How It Works
- ## Benefits/Results
- ## Getting Started / Call to Action`,
    contentFocus: "Create persuasive content that drives conversions while providing genuine value.",
    wordCountRange: { min: 1000, max: 1800 },
    specialInstructions: [
      "Focus on benefits over features",
      "Include social proof and testimonials",
      "Clear call-to-action",
      "Link to supporting content for objection handling",
    ],
  },
  
  case_study: {
    structureGuidelines: `
- ## Executive Summary / Key Results
- ## Background / Challenge
- ## Solution / Approach
- ## Implementation
- ## Results with specific metrics
- ## Key Takeaways
- ## About [Company/Client]`,
    contentFocus: "Tell a compelling success story with specific, measurable results.",
    wordCountRange: { min: 1500, max: 2500 },
    specialInstructions: [
      "Include specific numbers and metrics",
      "Tell a narrative story",
      "Make it relatable to the target audience",
      "Link to related how-to and solution content",
    ],
  },
  
  benchmark: {
    structureGuidelines: `
- ## Methodology
- ## Key Findings Summary
- ## Detailed Results (with data)
- ## Analysis by Category
- ## Recommendations
- ## Conclusion`,
    contentFocus: "Present original research or analysis with data-driven insights.",
    wordCountRange: { min: 2000, max: 3500 },
    specialInstructions: [
      "Include charts, tables, and data visualizations (describe them)",
      "Be rigorous about methodology",
      "Provide actionable insights from the data",
      "Link to related analysis and framework content",
    ],
  },
  
  framework: {
    structureGuidelines: `
- ## Introduction to the Framework
- ## Why This Framework Works
- ## The Framework Steps (numbered sections)
- ## How to Apply It
- ## Examples/Case Studies
- ## Common Mistakes to Avoid
- ## Templates/Tools (if applicable)`,
    contentFocus: "Present a reusable framework, methodology, or mental model that readers can apply.",
    wordCountRange: { min: 1800, max: 3000 },
    specialInstructions: [
      "Make the framework memorable and actionable",
      "Include step-by-step implementation guidance",
      "Provide templates or worksheets where possible",
      "Link to case studies and examples",
    ],
  },
  
  whitepaper: {
    structureGuidelines: `
- ## Executive Summary
- ## Introduction / Background
- ## Problem Statement
- ## Research/Analysis (multiple sections)
- ## Proposed Solution/Approach
- ## Implementation Considerations
- ## Conclusion
- ## References`,
    contentFocus: "Create authoritative, in-depth thought leadership content suitable for B2B audiences.",
    wordCountRange: { min: 3000, max: 5000 },
    specialInstructions: [
      "Maintain professional, authoritative tone",
      "Include research and citations",
      "Provide original insights and analysis",
      "Link to supporting framework and case study content",
    ],
  },
  
  how_to: {
    structureGuidelines: `
- Brief intro explaining what will be accomplished
- ## What You'll Need (prerequisites)
- ## Step 1: [Action] (numbered steps as ## headings)
- ## Step 2: [Action]
- (continue with all steps)
- ## Troubleshooting / Common Issues
- ## Next Steps`,
    contentFocus: "Provide clear, actionable step-by-step instructions that solve a specific problem.",
    wordCountRange: { min: 1000, max: 2000 },
    specialInstructions: [
      "Structure for HowTo schema rich snippets",
      "Number all steps clearly",
      "Include time estimates where relevant",
      "Add tips and warnings at appropriate steps",
      "Link to related how-to and support articles",
    ],
  },
  
  faq: {
    structureGuidelines: `
- Brief introduction
- ## [Question 1]?
  Answer paragraph
- ## [Question 2]?
  Answer paragraph
- (continue with 8-15 questions)
- ## Conclusion / Need More Help?`,
    contentFocus: "Answer the most common questions about a topic comprehensively.",
    wordCountRange: { min: 1500, max: 2500 },
    specialInstructions: [
      "Structure for FAQPage schema rich snippets",
      "Use actual question format for headings",
      "Provide concise but complete answers",
      "Link to detailed articles for complex topics",
    ],
  },
  
  listicle: {
    structureGuidelines: `
- Engaging introduction
- ## 1. [Item] (numbered list items as sections)
- ## 2. [Item]
- (continue for 7-15+ items)
- ## Conclusion / Key Takeaways`,
    contentFocus: "Create an engaging, scannable list format covering multiple items or tips.",
    wordCountRange: { min: 1200, max: 2000 },
    specialInstructions: [
      "Make each item standalone and valuable",
      "Use consistent format for each item",
      "Include images/examples where helpful",
      "Link to detailed articles for items that warrant deeper coverage",
    ],
  },
  
  news: {
    structureGuidelines: `
- ## [Headline-style summary in first paragraph]
- Key facts in first 2-3 paragraphs
- ## Background / Context
- ## What This Means
- ## What's Next
- ## Related Coverage`,
    contentFocus: "Report on recent developments, updates, or industry news in a timely manner.",
    wordCountRange: { min: 600, max: 1200 },
    specialInstructions: [
      "Structure for NewsArticle schema",
      "Include date/time references",
      "Quote sources where available",
      "Link to background/evergreen content",
    ],
  },
  
  general: {
    structureGuidelines: `
- Clear introduction
- ## Use 4-6 relevant sections
- Include examples and practical information
- Conclude with key takeaways`,
    contentFocus: "Create informative, well-structured content on the topic.",
    wordCountRange: { min: 1000, max: 1800 },
    specialInstructions: [
      "Focus on providing value to the reader",
      "Include relevant internal links",
    ],
  },
};

export function getRolePromptConfig(role: ArticleRole): RolePromptConfig {
  return rolePromptConfigs[role] || rolePromptConfigs.general;
}

export function getAnchorPatternGuidance(pattern: AnchorPattern): string {
  switch (pattern) {
    case "exact":
      return "Use the exact target keyword as anchor text";
    case "partial":
      return "Include the target keyword partially in natural anchor text";
    case "semantic":
      return "Use semantically related phrases as anchor text";
    case "action":
      return "Use action-oriented anchor text (e.g., 'learn how to...', 'discover...')";
    case "list":
      return "Use list-style anchor text (e.g., 'see our top picks', 'view the full list')";
    default:
      return "Use natural, descriptive anchor text";
  }
}

export interface LinkTarget {
  title: string;
  slug: string;
  role: ArticleRole;
  anchorPattern: AnchorPattern;
}

export function getLinkingInstructions(
  currentRole: ArticleRole,
  packType: PackType,
  availableTargets: LinkTarget[]
): string {
  if (availableTargets.length === 0) {
    return "";
  }

  const packDef = getPackDefinition(packType);
  const relevantRule = packDef.linkingRules.find(r => r.fromRole === currentRole);
  
  // First try to get targets matching pack rules
  let filteredTargets = relevantRule 
    ? availableTargets.filter(t => relevantRule.toRoles.includes(t.role)).slice(0, 5)
    : [];

  // If no matching targets, use all available targets (ensures internal linking)
  if (filteredTargets.length === 0) {
    filteredTargets = availableTargets.slice(0, 5);
  }

  if (filteredTargets.length === 0) {
    return "";
  }

  const anchorGuidance = relevantRule 
    ? getAnchorPatternGuidance(relevantRule.anchorPattern)
    : getAnchorPatternGuidance("semantic");
  
  const targetList = filteredTargets
    .map(t => `- "${t.title}" (/post/${t.slug})`)
    .join("\n");

  return `
INTERNAL LINKING STRATEGY${packDef ? ` (${packDef.name} Pack)` : ""}:
${anchorGuidance}

You MUST include internal links to these related articles naturally within your content. Each link should use the format [anchor text](/post/slug):
${targetList}

IMPORTANT: Include at least 2-3 internal links to these articles using descriptive, contextual anchor text.`;
}

export function detectRoleFromKeyword(keyword: string): ArticleRole {
  const kw = keyword.toLowerCase();
  
  if (kw.includes("how to") || kw.includes("guide to") || kw.includes("tutorial")) {
    return "how_to";
  }
  if (kw.includes("best ") || kw.includes("top ")) {
    return "rankings";
  }
  if (kw.includes("vs ") || kw.includes(" vs") || kw.includes("versus") || kw.includes("compare")) {
    return "comparison";
  }
  if (kw.includes("review") || kw.includes("rating")) {
    return "review";
  }
  if (kw.includes("what is") || kw.includes("what are") || kw.includes("meaning of")) {
    return "pillar";
  }
  if (kw.includes("faq") || kw.includes("questions")) {
    return "faq";
  }
  if (kw.includes("list of") || kw.includes("types of") || kw.includes("examples of")) {
    return "listicle";
  }
  if (kw.includes("case study") || kw.includes("success story")) {
    return "case_study";
  }
  if (kw.includes("benchmark") || kw.includes("statistics") || kw.includes("data")) {
    return "benchmark";
  }
  if (kw.includes("buy") || kw.includes("price") || kw.includes("cost") || kw.includes("discount")) {
    return "conversion";
  }
  
  return "support"; // Default to support articles for general keywords
}

function buildBusinessContextPrompt(context?: BusinessContext): string {
  if (!context) return "";
  
  const lines: string[] = [];
  
  if (context.businessDescription) {
    lines.push(`- Business: ${context.businessDescription}`);
  }
  if (context.targetAudience) {
    lines.push(`- Target Audience: ${context.targetAudience}`);
  }
  if (context.brandVoice) {
    lines.push(`- Brand Voice: ${context.brandVoice}`);
  }
  if (context.valuePropositions) {
    lines.push(`- Value Propositions: ${context.valuePropositions}`);
  }
  if (context.industry) {
    lines.push(`- Industry: ${context.industry}`);
  }
  if (context.competitors) {
    lines.push(`- Competitors: ${context.competitors}`);
  }
  
  if (lines.length === 0) return "";
  
  return `
BUSINESS CONTEXT:
${lines.join("\n")}

Write content that aligns with this brand voice and resonates with the target audience.
`;
}

export function buildRoleSpecificPrompt(
  role: ArticleRole,
  packType: PackType,
  title: string,
  keywords: string[],
  linkTargets: LinkTarget[],
  languageDirective: string,
  masterPrompt: string,
  businessContext?: BusinessContext
): string {
  const config = getRolePromptConfig(role);
  const linkingInstructions = getLinkingInstructions(role, packType, linkTargets);
  const businessContextPrompt = buildBusinessContextPrompt(businessContext);

  return `${masterPrompt}
${businessContextPrompt}
${languageDirective}

Write a ${role.replace(/_/g, " ").toUpperCase()} article optimized for SEO.

Topic: ${title}
Target keywords: ${keywords.join(", ")}

CONTENT FOCUS:
${config.contentFocus}

ARTICLE STRUCTURE:
${config.structureGuidelines}

WORD COUNT: ${config.wordCountRange.min}-${config.wordCountRange.max} words

${config.specialInstructions.length > 0 ? `SPECIAL INSTRUCTIONS:
${config.specialInstructions.map(i => `- ${i}`).join("\n")}` : ""}

${linkingInstructions}

FORMATTING RULES:
1. Write in Markdown format with proper structure
2. Use # for the main title only
3. Use ## for major sections, ### for subsections
4. Use bullet points, numbered lists, **bold**, and *italics* appropriately
5. Format internal links as: [anchor text](/post/slug)

Respond with valid JSON:
{
  "title": "The optimized article title",
  "content": "The full article content in Markdown",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "metaTitle": "SEO title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)"
}`;
}
