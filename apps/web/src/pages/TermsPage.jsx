import { Link } from 'react-router-dom';
import { LogoWordmark } from '../components/LogoWordmark';

const ink = 'var(--ct-ink)';
const teal = 'var(--ct-teal)';
const cream = 'var(--ct-cream)';

const sections = [
  {
    title: 'Who these terms cover',
    body: 'Tara, Cavite! is a travel companion for exploring cities and municipalities in Cavite. These Terms of Use apply when you create a traveler account, use maps and itineraries, save places, check in, or read announcements.',
  },
  {
    title: 'Your account',
    body: 'You must provide a working email and keep your password private. You are responsible for activity on your account. Do not share login details. The Tourism Office email is reserved for administration and cannot be used for a traveler signup.',
  },
  {
    title: 'What the app provides',
    body: 'Listings, routes, travel times, and itineraries are guides for planning, not guarantees. Road conditions, hours, fees, and weather can change. Always confirm details on site or with the establishment. Navigation may open Google Maps or similar third-party tools under their own terms.',
  },
  {
    title: 'Catalog and announcements',
    body: 'Establishments and attractions come from the Cavite tourism catalog and from accounts recognized by the Provincial Tourism Office. Notices may be posted by the Tourism Office or by verified establishments. We may edit or remove content that is outdated, misleading, or unsafe.',
  },
  {
    title: 'Check-ins, reviews, and saved lists',
    body: 'Check-ins should reflect a real visit. Reviews must be your own honest experience. Do not post abuse, spam, or other people’s private information. Saved lists are yours to keep private or share as the app allows.',
  },
  {
    title: 'Acceptable use',
    body: 'Do not scrape the catalog, interfere with the service, impersonate the Tourism Office, or use the app to harm people or property. We may suspend accounts that break these rules or that the Tourism Office deactivates.',
  },
  {
    title: 'Privacy',
    body: 'We use your account data to sign you in, personalize saved lists and routes, and show relevant travel notices. See the Privacy notice for how lists and profile details are treated.',
  },
  {
    title: 'Changes',
    body: 'We may update these terms as the service grows. Continued use after an update means you accept the revised terms. The current version is always available at this page.',
  },
];

export function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-8 font-['Poppins',sans-serif]" style={{ backgroundColor: cream }}>
      <main className="mx-auto w-full max-w-2xl">
        <Link to="/" className="inline-flex">
          <LogoWordmark className="text-sm" />
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight" style={{ color: ink }}>
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Tara, Cavite! traveler app · Last updated 2 September 2026</p>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-[#e4ece9] bg-white p-5 shadow-[0_4px_18px_rgba(22,53,46,0.06)]">
              <h2 className="text-base font-semibold" style={{ color: ink }}>
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          Questions? Read the{' '}
          <Link to="/privacy" className="font-semibold hover:underline" style={{ color: teal }}>
            Privacy notice
          </Link>
          {' '}or return to{' '}
          <Link to="/signup" className="font-semibold hover:underline" style={{ color: teal }}>
            create an account
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
