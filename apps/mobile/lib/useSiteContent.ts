import { useEffect, useState } from 'react';
import {
  fetchSiteContent,
  SITE_CONTENT_DEFAULTS,
  subscribeSiteContent,
} from 'cavitour-shared/siteContent';
import { supabase } from './supabase';

export function useSiteContent() {
  const [content, setContent] = useState(SITE_CONTENT_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetchSiteContent(supabase)
      .then((map) => {
        if (!cancelled) setContent(map as typeof SITE_CONTENT_DEFAULTS);
      })
      .catch(() => {
        if (!cancelled) setContent({ ...SITE_CONTENT_DEFAULTS });
      });
    const unsub = subscribeSiteContent(supabase, () => {
      fetchSiteContent(supabase)
        .then((map) => {
          if (!cancelled) setContent(map as typeof SITE_CONTENT_DEFAULTS);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return content;
}
