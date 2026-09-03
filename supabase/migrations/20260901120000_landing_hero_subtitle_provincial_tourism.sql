-- Refresh landing hero subtitle for existing site_content rows.
UPDATE public.site_content
SET value = 'Discover verified spots, follow curated step-by-step itineraries, get turn-by-turn navigation, and stay updated with official announcements from local establishments and the Provincial Tourism Office of Cavite in one complete platform.'
WHERE key = 'landing.hero.subtitle';
