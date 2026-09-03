import { createContext, useContext, useEffect, useState } from 'react';
import { fetchSiteContent, SITE_CONTENT_DEFAULTS, subscribeSiteContent } from 'cavitour-shared/siteContent';
import { supabase } from './supabase';

const SiteContentContext = createContext(SITE_CONTENT_DEFAULTS);

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(SITE_CONTENT_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetchSiteContent(supabase)
      .then((map) => {
        if (!cancelled) setContent(map);
      })
      .catch(() => {
        if (!cancelled) setContent({ ...SITE_CONTENT_DEFAULTS });
      });
    const unsub = subscribeSiteContent(supabase, () => {
      fetchSiteContent(supabase)
        .then((map) => {
          if (!cancelled) setContent(map);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
