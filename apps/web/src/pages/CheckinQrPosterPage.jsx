import { Link, useParams } from 'react-router-dom';
import { buildCheckinUrl, normalizeCheckinCode, qrImageUrl } from 'cavitour-shared/placeCheckin';
import { LogoWordmark } from '../components/LogoWordmark';

/**
 * Printable poster for an establishment QR.
 * Open from Admin → Destinations → Edit → "Print QR poster".
 * Visitors scan this QR with their phone camera → /checkin/CT-… → visit counted.
 */
export function CheckinQrPosterPage() {
  const { code: raw } = useParams();
  const code = normalizeCheckinCode(raw || '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const checkinUrl = buildCheckinUrl(origin, code);
  const qrUrl = qrImageUrl(checkinUrl, 420);

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 font-['Inter',sans-serif]">
        <p className="text-sm text-neutral-600">Missing check-in code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 font-['Inter',sans-serif] text-neutral-900">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center print:max-w-none">
        <div className="no-print mb-6 flex w-full items-center justify-between gap-3">
          <Link to="/" className="inline-flex">
            <LogoWordmark className="text-sm" />
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#1f4f59] px-4 py-2 text-sm font-semibold text-white"
          >
            Print / Save as PDF
          </button>
        </div>

        <p className="font-['Poppins',sans-serif] text-sm font-semibold uppercase tracking-[0.14em] text-[#1f4f59]">
          Tara, Cavite! check-in
        </p>
        <h1 className="mt-2 font-['Poppins',sans-serif] text-2xl font-semibold sm:text-3xl">
          Scan to count your visit
        </h1>
        <p className="mt-2 max-w-sm text-sm text-neutral-600">
          Use your phone camera. You must be signed in to Tara, Cavite! — one visit per day is counted for this
          establishment (admin + business).
        </p>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
          <img src={qrUrl} alt={`Check-in QR ${code}`} width={280} height={280} className="mx-auto bg-white" />
          <p className="mt-4 font-mono text-lg font-semibold tracking-wide">{code}</p>
        </div>

        <p className="mt-6 break-all text-xs text-neutral-400">{checkinUrl}</p>
        <p className="no-print mt-8 text-xs text-neutral-500">
          Display this poster at the entrance. Visitors should not type the code unless the scan fails.
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
