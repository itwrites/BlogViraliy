import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Cookie, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GdprBannerProps {
  message: string;
  acceptButtonText: string;
  declineButtonText: string;
  backgroundColor: string;
  textColor: string;
  siteId: string;
  analyticsId?: string;
  onConsentChange?: (consented: boolean) => void;
}

const CONSENT_KEY_PREFIX = "gdpr_consent_";

export function getGdprConsent(siteId: string): boolean | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`${CONSENT_KEY_PREFIX}${siteId}`);
  if (stored === null) return null;
  return stored === "true";
}

export function GdprBanner({
  message,
  acceptButtonText,
  declineButtonText,
  backgroundColor,
  textColor,
  siteId,
  analyticsId,
  onConsentChange,
}: GdprBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const storageKey = `${CONSENT_KEY_PREFIX}${siteId}`;

  useEffect(() => {
    const consent = getGdprConsent(siteId);
    setHasConsented(consent);
    
    if (consent === null) {
      setIsVisible(true);
    } else if (consent === true && analyticsId) {
      loadGoogleAnalytics(analyticsId);
    }
  }, [siteId, analyticsId]);

  const loadGoogleAnalytics = (gaId: string) => {
    if (!gaId || typeof window === "undefined") return;
    
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`);
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);

    const configScript = document.createElement("script");
    configScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(configScript);
  };

  const handleAccept = () => {
    localStorage.setItem(storageKey, "true");
    setHasConsented(true);
    setIsVisible(false);
    
    if (analyticsId) {
      loadGoogleAnalytics(analyticsId);
    }
    
    onConsentChange?.(true);
  };

  const handleDecline = () => {
    localStorage.setItem(storageKey, "false");
    setHasConsented(false);
    setIsVisible(false);
    onConsentChange?.(false);
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={prefersReducedMotion ? {} : { duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
          data-testid="banner-gdpr"
        >
          <div 
            className="max-w-4xl mx-auto rounded-lg shadow-2xl p-4 md:p-6"
            style={{ backgroundColor, color: textColor }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-full bg-white/10 flex-shrink-0">
                  <Cookie className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-semibold text-sm">Cookie Consent</span>
                  </div>
                  <p className="text-sm opacity-90" data-testid="text-gdpr-message">
                    {message}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  className="flex-1 md:flex-none border-current/30 hover:bg-white/10"
                  style={{ color: textColor, borderColor: `${textColor}30` }}
                  data-testid="button-gdpr-decline"
                >
                  {declineButtonText}
                </Button>
                <Button
                  onClick={handleAccept}
                  className="flex-1 md:flex-none"
                  style={{ 
                    backgroundColor: textColor, 
                    color: backgroundColor,
                  }}
                  data-testid="button-gdpr-accept"
                >
                  {acceptButtonText}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
