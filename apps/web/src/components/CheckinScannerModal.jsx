import { useCallback, useEffect, useRef, useState } from 'react';
import { extractCheckinCodeFromText } from 'cavitour-shared/placeCheckin';

/**
 * In-browser QR scanner modal (getUserMedia + BarcodeDetector when available).
 * Falls back to manual code entry if the browser cannot decode live video.
 */
export function CheckinScannerModal({ open, onClose, onCode }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('Point at a printed poster QR — not the QR on this screen');

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  const handleDecoded = useCallback(
    async (raw) => {
      if (locked.current || busy) return;
      const code = extractCheckinCodeFromText(raw);
      if (!code) return;
      locked.current = true;
      setBusy(true);
      setHint('Recording your visit…');
      try {
        await onCode(code);
        onClose();
      } finally {
        setBusy(false);
        setTimeout(() => {
          locked.current = false;
        }, 1200);
      }
    },
    [busy, onClose, onCode]
  );

  useEffect(() => {
    if (!open) {
      stop();
      locked.current = false;
      setError('');
      setBusy(false);
      setHint('Point at a printed poster QR — not the QR on this screen');
      return;
    }

    let cancelled = false;

    const start = async () => {
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available in this browser. Enter the code under the QR, or tap Check in here.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        const Detector = window.BarcodeDetector;
        if (typeof Detector !== 'function') {
          setError(
            'Live QR decode is not supported in this browser. Use Chrome/Edge, or type the code below / tap the QR on the page.'
          );
          return;
        }

        const detector = new Detector({ formats: ['qr_code'] });
        const tick = async () => {
          if (cancelled || locked.current) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          try {
            const videoEl = videoRef.current;
            if (videoEl && videoEl.readyState >= 2) {
              const codes = await detector.detect(videoEl);
              if (codes?.[0]?.rawValue) {
                await handleDecoded(codes[0].rawValue);
              }
            }
          } catch {
            // ignore frame errors
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Could not open the camera. Allow camera permission, or enter the code manually.'
          );
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, handleDecoded, stop]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan check-in QR"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h2 className="font-['Poppins',sans-serif] text-base font-semibold text-neutral-900">Scan poster QR</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-[#1f4f59]">
            Close
          </button>
        </div>

        <div className="relative aspect-[3/4] max-h-[55vh] bg-neutral-900">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
          <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-[#a3e635]/90" />
          <p className="absolute bottom-3 left-3 right-3 text-center text-sm text-white drop-shadow">{hint}</p>
        </div>

        {error ? <p className="px-4 pt-3 text-sm text-amber-800">{error}</p> : null}

        <form
          className="space-y-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleDecoded(manual);
          }}
        >
          <label className="block text-xs font-semibold text-neutral-600" htmlFor="manual-checkin-scan">
            Or type the code under the QR
          </label>
          <input
            id="manual-checkin-scan"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="CT-XXXXXXXX"
            className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none"
            autoCapitalize="characters"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-full text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#1f4f59' }}
          >
            {busy ? 'Checking in…' : 'Confirm check-in'}
          </button>
        </form>
      </div>
    </div>
  );
}
