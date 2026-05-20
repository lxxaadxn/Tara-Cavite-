import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function PlaceImageLightbox({ images, initialIndex = 0, alt = 'Place photo', onClose }) {
  const safeImages = images?.length ? images : [];
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), safeImages.length - 1));
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef(null);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const next = Math.min(Math.max(0, initialIndex), Math.max(0, safeImages.length - 1));
    setIndex(next);
    resetView();
  }, [initialIndex, safeImages.length, resetView]);

  useEffect(() => {
    resetView();
  }, [index, resetView]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (safeImages.length < 2) return;
      if (e.key === 'ArrowLeft') {
        setIndex((i) => (i <= 0 ? safeImages.length - 1 : i - 1));
      }
      if (e.key === 'ArrowRight') {
        setIndex((i) => (i >= safeImages.length - 1 ? 0 : i + 1));
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, safeImages.length]);

  const zoomBy = (delta) => {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta));
      if (next <= MIN_SCALE) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const onWheel = (e) => {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? -0.2 : 0.2);
  };

  const onPointerDown = (e) => {
    if (scale <= 1) return;
    dragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setPan({
      x: dragOrigin.current.panX + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.panY + (e.clientY - dragOrigin.current.y),
    });
  };

  const onPointerUp = (e) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!safeImages.length) return null;

  const src = safeImages[index];
  const zoomOut = () => zoomBy(-0.25);

  return (
    <div
      className="fixed inset-0 z-[1300] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — photo viewer`}
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="min-w-0 truncate text-sm font-medium text-white/90">
          {alt}
          {safeImages.length > 1 ? (
            <span className="ml-2 text-white/60">
              {index + 1} / {safeImages.length}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => zoomOut()}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 tabular-nums"
            aria-label="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.25)}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-6 pt-2 sm:px-8"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
      >
        {safeImages.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => (i <= 0 ? safeImages.length - 1 : i - 1))}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-2.5 text-white transition hover:bg-black/70 sm:left-4"
            aria-label="Previous photo"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        <div
          className={`max-h-full max-w-full touch-none ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: dragging.current ? 'none' : 'transform 0.15s ease-out',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => {
            if (scale > 1) resetView();
            else setScale(2);
          }}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[min(78vh,820px)] max-w-[min(92vw,1200px)] select-none rounded-lg object-contain shadow-2xl"
            draggable={false}
          />
        </div>

        {safeImages.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => (i >= safeImages.length - 1 ? 0 : i + 1))}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-2.5 text-white transition hover:bg-black/70 sm:right-4"
            aria-label="Next photo"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <p className="shrink-0 pb-4 text-center text-xs text-white/50" onClick={(e) => e.stopPropagation()}>
        Scroll or use + / − to zoom · double-click to toggle · drag when zoomed · Esc to close
      </p>
    </div>
  );
}
