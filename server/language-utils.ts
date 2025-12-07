import { ContentLanguage, languageDisplayNames } from "@shared/schema";

export function buildLanguageDirective(targetLanguage: ContentLanguage | string): string {
  const langName = languageDisplayNames[targetLanguage as ContentLanguage] || targetLanguage;
  
  if (targetLanguage === "en") {
    return "Write all content in English.";
  }
  
  return `IMPORTANT LANGUAGE REQUIREMENT: Write ALL content in ${langName}. 
The title, content, headings, and all text must be written entirely in ${langName}.
Do NOT write in English - write everything in ${langName}.
If source material is in a different language, translate and adapt it to ${langName} while preserving meaning and style.`;
}

export function buildTranslationDirective(targetLanguage: ContentLanguage | string): string {
  const langName = languageDisplayNames[targetLanguage as ContentLanguage] || targetLanguage;
  
  if (targetLanguage === "en") {
    return "Rewrite the content in English. If the source is already in English, maintain the language.";
  }
  
  return `CRITICAL TRANSLATION REQUIREMENT: 
The source content may be in any language (including English), but you MUST translate and rewrite ALL content into ${langName}.
- Translate the title to ${langName}
- Translate and rewrite all content in ${langName}
- Use natural, native-quality ${langName} writing
- Preserve the meaning, tone, and key information while making it read naturally in ${langName}
- Do NOT leave any text in the original source language`;
}

export function getLanguageForPrompt(targetLanguage: ContentLanguage | string | null | undefined): string {
  return targetLanguage || "en";
}
