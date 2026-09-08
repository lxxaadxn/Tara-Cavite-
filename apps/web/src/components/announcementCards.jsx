/**
 * Traveler-facing announcement card and detail dialog. Shared so the
 * establishment portal can preview a post exactly as travelers will see it.
 */
import { useEffect, useId } from 'react';
import {
  announcementCardDateParts,
  announcementDisplayDateIso,
  announcementLocationLabel,
  announcementMapUrl,
  formatAnnouncementBodyHtml,
  formatAnnouncementDateTimeParts,
} from 'cavitour-shared/announcements';

function AnnouncementCardDate({ iso }) {
  const parts = announcementCardDateParts(iso);
  if (!parts) {
    return <p className="text-sm font-medium text-neutral-400">Date TBA</p>;
  }
  return (
    <div className="flex items-end gap-1.5">
      <span className="font-['Poppins',sans-serif] text-4xl font-normal leading-none tracking-tight text-neutral-900 sm:text-5xl">
        {parts.day}
      </span>
      <span className="pb-0.5 text-xs font-normal leading-tight text-neutral-500 sm:text-sm">
        {parts.month}
        <br />
        {parts.year}
      </span>
    </div>
  );
}

function AnnouncementCover({ item }) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  const isAdvisory = item.kind === 'advisory';
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${
        isAdvisory
          ? 'bg-gradient-to-br from-[#F4E8D4] to-[#C47B17]'
          : 'bg-gradient-to-br from-[#D8EDE7] to-[#1B8A70]'
      }`}
      aria-hidden
    >
      <span className="px-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
        {isAdvisory ? 'Advisory' : 'Event'}
      </span>
    </div>
  );
}

export function AnnouncementCard({ item, onSeeMore }) {
  const hasRegister = Boolean(item.actionUrl);
  const location = announcementLocationLabel(item);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/80">
      <div className="flex flex-1 flex-col px-3 pb-2.5 pt-2.5 sm:px-3.5 sm:pt-3">
        <AnnouncementCardDate iso={announcementDisplayDateIso(item)} />
        {location ? (
          <p className="mt-1.5 text-xs font-normal text-neutral-500 sm:text-sm">{location}</p>
        ) : null}
        <h2 className="mt-2 min-h-[2.5rem] text-base font-bold leading-snug text-neutral-800 sm:min-h-[2.75rem] sm:text-lg">
          {item.title}
        </h2>
      </div>

      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-neutral-100">
        <AnnouncementCover item={item} />
      </div>

      <div className="flex shrink-0 items-stretch bg-[#1a2e28] text-xs font-medium text-white sm:text-[13px]">
        {hasRegister ? (
          <>
            <a
              href={item.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center px-2 py-2.5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9FD4C4]"
            >
              Register
            </a>
            <span className="w-px self-stretch bg-white/25" aria-hidden />
            <button
              type="button"
              className="flex flex-1 items-center justify-center px-2 py-2.5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9FD4C4]"
              onClick={() => onSeeMore(item)}
            >
              See more
            </button>
          </>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-center px-2 py-2.5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9FD4C4]"
            onClick={() => onSeeMore(item)}
          >
            See more
          </button>
        )}
      </div>
    </article>
  );
}

export function AnnouncementDetailModal({ item, onClose }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;

  const location = announcementLocationLabel(item);
  const eventParts = formatAnnouncementDateTimeParts(item.eventStartsAt, item.eventEndsAt);
  const mapUrl = announcementMapUrl(item);
  const bodyHtml = formatAnnouncementBodyHtml(item.body);
  const isAdvisory = item.kind === 'advisory';
  const accent = isAdvisory
    ? {
        strip: 'from-[#E8A23A] to-[#C47B17]',
        badge: 'bg-[#FFF4E5] text-[#9A5B0F] ring-[#F0D2A0]',
        date: 'bg-[#FFF8EF] text-[#8A4F0C] ring-[#F2D9B0]',
        soft: 'bg-[#FFFBF5]',
        map: 'bg-[#C47B17] hover:bg-[#A86812]',
      }
    : {
        strip: 'from-[#3CB89A] to-[#1B8A70]',
        badge: 'bg-[#E7F6F1] text-[#146B57] ring-[#B8E0D4]',
        date: 'bg-[#F1F7F6] text-[#146B57] ring-[#C5E5DB]',
        soft: 'bg-[#F7FBFA]',
        map: 'bg-[#1B8A70] hover:bg-[#167a63]',
      };

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-[#0F2A24]/55 p-4 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl ${accent.soft} shadow-[0_24px_60px_rgba(15,42,36,0.28)] ring-1 ring-black/5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${accent.strip}`} aria-hidden />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#16352E] shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-[#1B8A70]"
          aria-label="Close"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="max-h-[calc(85vh-6px)] overflow-y-auto p-5 pr-14 sm:p-6 sm:pr-14">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ${accent.badge}`}
              >
                {isAdvisory ? 'Advisory' : 'Event'}
              </span>
              <h2 id={titleId} className="mt-2 text-xl font-semibold tracking-tight text-[#16352E]">
                {item.title}
              </h2>
              {location ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#4F7A70]">
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      isAdvisory ? 'bg-[#C47B17]' : 'bg-[#1B8A70]'
                    }`}
                    aria-hidden
                  />
                  {location}
                </p>
              ) : null}
            </div>
            {eventParts.length ? (
              <div
                className={`mr-1 shrink-0 rounded-xl px-3 py-2 text-right text-xs font-medium leading-snug ring-1 sm:text-sm ${accent.date}`}
              >
                {eventParts.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div
            className="mt-5 rounded-xl bg-white/80 px-4 py-3.5 text-sm leading-relaxed text-[#3D5C54] shadow-[inset_0_0_0_1px_rgba(22,53,46,0.06)] [&_strong]:font-semibold [&_strong]:text-[#16352E]"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          <div className="mt-6 flex flex-wrap gap-2">
            {item.actionUrl ? (
              <a
                href={item.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${accent.map}`}
              >
                Register
              </a>
            ) : null}
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${accent.map}`}
              >
                Open map
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
