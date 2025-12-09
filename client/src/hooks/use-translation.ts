import { useMemo } from "react";
import { getTranslation, getTranslations, formatDateLocalized, type TranslationKey } from "@/lib/translations";
import type { ContentLanguage } from "@shared/schema";

export function useTranslation(language: ContentLanguage | string = "en") {
  const t = useMemo(() => {
    return (key: TranslationKey) => getTranslation(language, key);
  }, [language]);

  const translations = useMemo(() => {
    return getTranslations(language);
  }, [language]);

  const formatDate = useMemo(() => {
    return (date: Date | string) => formatDateLocalized(date, language);
  }, [language]);

  return { t, translations, formatDate, language };
}
