import { siteContentValue } from 'cavitour-shared/siteContent';
import { useSiteContent } from '../lib/useSiteContent';

export function LogoWordmark({ light = false, className = '' }) {
  const content = useSiteContent();
  const primary = siteContentValue(content, light ? 'brand.logo_dark_url' : 'brand.logo_light_url');
  const fallback = siteContentValue(content, light ? 'brand.logo_light_url' : 'brand.logo_dark_url');
  const logoUrl = String(primary || fallback || '').trim();
  const tara = light ? '#39A98F' : '#10A37F';
  const cavite = light ? '#AACBC4' : '#1B8A70';

  const wordmark = (
    <span className="inline-flex items-baseline font-['Bebas_Neue',sans-serif] font-normal tracking-[0.04em]">
      <span className="text-[1.85rem] leading-none md:text-[2.15rem]" style={{ color: tara }}>
        Tara
      </span>
      <span className="text-[1.85rem] leading-none md:text-[2.15rem]" style={{ color: cavite }}>
        , Cavite!
      </span>
    </span>
  );

  if (logoUrl) {
    return (
      <span className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label="Tara, Cavite!">
        <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-contain md:h-10 md:w-10" />
        {wordmark}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center select-none ${className}`} aria-label="Tara, Cavite!">
      {wordmark}
    </span>
  );
}
