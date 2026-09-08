import { siteContentValue } from 'cavitour-shared/siteContent';
import { useSiteContent } from '../lib/useSiteContent';

const DEFAULT_BRAND_NAME = 'Tara, Cavite!';

export function LogoWordmark({ light = false, className = '' }) {
  const content = useSiteContent();
  const logoUrl = String(siteContentValue(content, 'brand.logo_light_url') || '').trim();
  const brandName = String(siteContentValue(content, 'brand.name') || DEFAULT_BRAND_NAME).trim() || DEFAULT_BRAND_NAME;
  const tara = light ? '#39A98F' : '#10A37F';
  const cavite = light ? '#AACBC4' : '#1B8A70';

  const commaAt = brandName.indexOf(',');
  const wordmark =
    commaAt >= 0 ? (
      <span className="inline-flex items-baseline font-['Bebas_Neue',sans-serif] font-normal tracking-[0.04em]">
        <span className="text-[1.85rem] leading-none md:text-[2.15rem]" style={{ color: tara }}>
          {brandName.slice(0, commaAt)}
        </span>
        <span className="text-[1.85rem] leading-none md:text-[2.15rem]" style={{ color: cavite }}>
          {brandName.slice(commaAt)}
        </span>
      </span>
    ) : (
      <span
        className="inline-flex items-baseline font-['Bebas_Neue',sans-serif] font-normal tracking-[0.04em] text-[1.85rem] leading-none md:text-[2.15rem]"
        style={{ color: tara }}
      >
        {brandName}
      </span>
    );

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`} aria-label={brandName}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-contain md:h-10 md:w-10" />
      ) : null}
      {wordmark}
    </span>
  );
}
