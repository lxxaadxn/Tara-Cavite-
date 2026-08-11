import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  extractCheckinCodeFromText,
  foldEstablishmentName,
  normalizeCheckinCode,
  recordCheckinByCode,
} from 'cavitour-shared/placeCheckin';
import { LogoWordmark } from '../components/LogoWordmark';
import { supabase } from '../lib/supabase';
import { recordDestinationReached } from '../lib/destinationReachedActivity';

const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';

async function syncProfileVisitFromCheckin(userId, placeName, placeIdHint) {
  try {
    let placeId = String(placeIdHint || '').trim();
    if (!placeId && placeName) {
      const fold = foldEstablishmentName(placeName);
      const { data: places } = await supabase.from('places').select('id, name').limit(800);
      const hit = (places || []).find((p) => foldEstablishmentName(p.name) === fold);
      if (hit?.id) placeId = String(hit.id);
    }
    if (!placeId) placeId = String(placeIdHint || '').trim();
    if (!userId || !placeId) return;
    recordDestinationReached(userId, placeId, { name: placeName || 'Place' });
  } catch {
  }
}

export function CheckinPage() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [title, setTitle] = useState('Checking you in…');
  const [manualCode, setManualCode] = useState('');
  const fromQr = Boolean(normalizeCheckinCode(codeParam || ''));

  useEffect(() => {
    const fromParam = normalizeCheckinCode(codeParam || '');
    if (!fromParam) return;

    let active = true;
    const run = async () => {
      setStatus('working');
      setTitle('Checking you in…');
      setMessage('Recording your visit…');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!active) return;
          navigate(`/login?next=${encodeURIComponent(`/checkin/${fromParam}`)}`, { replace: true });
          return;
        }
        const result = await recordCheckinByCode(supabase, fromParam, 'qr');
        if (!active) return;
        await syncProfileVisitFromCheckin(session.user.id, result.placeName, result.placeId);
        setPlaceName(result.placeName);
        setStatus('ok');
        setTitle(result.alreadyCheckedIn ? 'Already checked in' : 'Thank you for visiting!');
        setMessage(
          result.alreadyCheckedIn
            ? `You already checked in today at ${result.placeName}. Thank you for visiting!`
            : `Thank you for visiting ${result.placeName}! Your visit was counted.`
        );
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Check-in failed.';
        if (/sign in required|jwt|not authenticated/i.test(msg)) {
          navigate(`/login?next=${encodeURIComponent(`/checkin/${fromParam}`)}`, { replace: true });
          return;
        }
        setStatus('error');
        setTitle('Check-in failed');
        setMessage(msg);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [codeParam, navigate]);

  const onManual = async (e) => {
    e.preventDefault();
    const normalized = extractCheckinCodeFromText(manualCode);
    if (!normalized) {
      setStatus('error');
      setTitle('Check-in failed');
      setMessage('Enter a valid code (e.g. CT-XXXXXXXX).');
      return;
    }
    setStatus('working');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/login?next=${encodeURIComponent(`/checkin/${normalized}`)}`, { replace: true });
        return;
      }
      const result = await recordCheckinByCode(supabase, normalized, 'code');
      await syncProfileVisitFromCheckin(session.user.id, result.placeName, result.placeId);
      setPlaceName(result.placeName);
      setStatus('ok');
      setTitle(result.alreadyCheckedIn ? 'Already checked in' : 'Thank you for visiting!');
      setMessage(
        result.alreadyCheckedIn
          ? `You already checked in today at ${result.placeName}. Thank you for visiting!`
          : `Thank you for visiting ${result.placeName}! Your visit was counted.`
      );
    } catch (err) {
      setStatus('error');
      setTitle('Check-in failed');
      setMessage(err instanceof Error ? err.message : 'Check-in failed.');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 font-['Inter',sans-serif]"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
        role="alertdialog"
        aria-labelledby="checkin-title"
        aria-describedby="checkin-msg"
      >
        <div className="mb-4 flex justify-center">
          <LogoWordmark className="text-sm" />
        </div>

        {status === 'working' || (fromQr && status === 'idle') ? (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-[var(--ct-teal)]" />
            <h1 id="checkin-title" className="font-['Poppins',sans-serif] text-lg font-semibold" style={{ color: ink }}>
              {title}
            </h1>
            <p id="checkin-msg" className="mt-2 text-sm text-neutral-600">
              {message || 'Recording your visit…'}
            </p>
          </>
        ) : status === 'ok' ? (
          <>
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
              style={{ backgroundColor: teal }}
              aria-hidden
            >
              ✓
            </div>
            <h1 id="checkin-title" className="font-['Poppins',sans-serif] text-xl font-semibold" style={{ color: ink }}>
              {title}
            </h1>
            <p id="checkin-msg" className="mt-3 text-base text-neutral-700">
              {message}
            </p>
            {placeName ? (
              <p className="mt-1 text-sm font-semibold" style={{ color: teal }}>
                {placeName}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-neutral-400">You can close this tab.</p>
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else window.close();
              }}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: teal }}
            >
              OK
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void onManual(e)} className="space-y-3 text-left">
            <h1
              id="checkin-title"
              className="text-center font-['Poppins',sans-serif] text-lg font-semibold"
              style={{ color: ink }}
            >
              {fromQr ? title : 'Establishment check-in'}
            </h1>
            {message ? (
              <p
                id="checkin-msg"
                className={`text-center text-sm ${status === 'error' ? 'text-red-600' : 'text-neutral-600'}`}
              >
                {message}
              </p>
            ) : (
              <p id="checkin-msg" className="text-center text-sm text-neutral-500">
                Enter the code printed under the establishment QR.
              </p>
            )}
            <input
              id="checkin-code"
              name="checkin-code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="CT-XXXXXXXX"
              className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none"
              autoCapitalize="characters"
            />
            <button
              type="submit"
              className="h-11 w-full rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: teal }}
            >
              Confirm check-in
            </button>
            <p className="text-center text-xs text-neutral-400">
              <Link to="/" className="underline">
                Close
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
