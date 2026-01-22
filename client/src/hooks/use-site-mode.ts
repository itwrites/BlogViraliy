import { useState, useEffect } from 'react';

export type SiteMode = 'beginner' | 'advanced';

export function useSiteMode(siteId?: string) {
    const [mode, setMode] = useState<SiteMode>('beginner');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!siteId) return;
        const stored = localStorage.getItem(`site-mode-${siteId}`);
        if (stored === 'beginner' || stored === 'advanced') {
            setMode(stored);
        }
        setIsLoaded(true);
    }, [siteId]);

    const setSiteMode = (newMode: SiteMode) => {
        if (!siteId) return;
        setMode(newMode);
        localStorage.setItem(`site-mode-${siteId}`, newMode);
    };

    return { mode, setMode: setSiteMode, isLoaded };
}
