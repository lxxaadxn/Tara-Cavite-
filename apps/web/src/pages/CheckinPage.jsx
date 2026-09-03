import { Link, useParams } from 'react-router-dom';
import { CHECKIN_APP_PATH, normalizeCheckinCode } from 'cavitour-shared/placeCheckin';
import { LogoWordmark } from '../components/LogoWordmark';

const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';

export function CheckinPage() {
  const { code: codeParam } = useParams();
  const code = normalizeCheckinCode(codeParam || '');
  const appHref = code ? `cavitour://${CHECKIN_APP_PATH}/${encodeURIComponent(code)}` : `cavitour://${CHECKIN_APP_PATH}`;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 font-['Poppins',sans-serif]"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
        role="dialog"
        aria-labelledby="checkin-title"
        aria-describedby="checkin-msg"
      >
        <div className="mb-4 flex justify-center">
          <LogoWordmark className="text-sm" />
        </div>
        <h1
          id="checkin-title"
          className="font-['Poppins',sans-serif] text-lg font-semibold"
          style={{ color: ink }}
        >
          Check in on the Tara, Cavite! app
        </h1>
        <p id="checkin-msg" className="mt-3 text-sm leading-relaxed text-neutral-600">
          This website is for browsing and planning trips. Visit check-in is only available in the
          mobile app.
        </p>
        {code ? (
          <p className="mt-3 font-mono text-sm font-semibold tracking-wide text-neutral-900">{code}</p>
        ) : null}
        <a
          href={appHref}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: teal }}
        >
          Open in app
        </a>
        <p className="mt-4 text-center text-xs text-neutral-400">
          <Link to="/" className="underline">
            Continue browsing
          </Link>
        </p>
      </div>
    </div>
  );
}
