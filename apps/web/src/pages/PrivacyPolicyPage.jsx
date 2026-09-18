const ink = 'var(--ct-ink)';
const teal = 'var(--ct-teal)';
const cream = 'var(--ct-cream)';
const mint = '#D4EFE8';
const rail = '#BFDCD3';

const sections = [
  {
    title: 'Information we collect',
    subs: [
      {
        label: 'a',
        title: 'Account information',
        body: 'When you create an account, we collect your email address, name, and unique user ID. If you sign in with Google, we receive your Google account name and email address as authorized by you. Authentication is handled through our backend provider, Supabase (Supabase, Inc.).',
      },
      {
        label: 'b',
        title: 'Location information',
        body: 'With your permission, the App collects device location (precise, foreground only). We use your location solely to: show your position on in-app maps; calculate distances and directions to tourist destinations and establishments; and help you navigate using Google Maps directions. We do not track your location in the background, and we do not store your location history on our servers. Location data is processed on your device and is not used to build advertising or behavioral profiles.',
      },
      {
        label: 'c',
        title: 'Camera access',
        body: 'With your permission, the App uses your device camera solely to scan QR codes for establishment check-ins. The App does not take, store, or upload photographs of you or your surroundings through camera use.',
      },
      {
        label: 'd',
        title: 'Photos you choose to submit',
        body: 'If you write a review for an establishment, you may optionally attach up to four (4) photos from your device. These photos are uploaded to and stored in secure Supabase Storage and may be displayed publicly on the App alongside your review (with your display name).',
      },
      {
        label: 'e',
        title: 'User content and activity',
        body: 'Reviews and ratings you submit (text, rating, photos, display name, timestamp); check-in records confirming visits to establishments; and saved lists and preferences (saved places, filters, itineraries).',
      },
      {
        label: 'f',
        title: 'Locally stored information',
        body: 'The App stores certain preferences and activity data on your device only using local storage (AsyncStorage), such as your sign-in state, saved places, filters, and recent visit activity. This data stays on your device unless the features above explicitly sync it to our servers.',
      },
      {
        label: 'g',
        title: 'Automatic data',
        body: 'When you use the App, our backend may process standard technical information such as IP addresses and device/session identifiers necessary to deliver the service, secure accounts, and prevent abuse.',
      },
    ],
  },
  {
    title: 'How we use information',
    body: 'We use the information we collect to create and manage your account and authenticate you (including Google sign-in); provide core App features: browsing destinations, maps, directions, itineraries, check-ins, and reviews; display your reviews, photos, and check-in activity within the App; maintain the security, integrity, and safety of the App, including detecting fraud and abuse; respond to support requests and account issues, including account deletion requests; and comply with legal obligations.',
    note: 'We do not sell your personal information. We do not use your data for third-party advertising, and the App contains no ads and no third-party analytics or tracking SDKs.',
  },
  {
    title: 'Legal bases (for EEA/UK users)',
    body: 'Where the GDPR applies, we process your data on the following bases: Contract \u2014 to provide the App\u2019s features you request (account, reviews, check-ins); Consent \u2014 for location access and camera access, which you may withdraw at any time via your device settings; Legitimate interests \u2014 to secure the service and prevent abuse.',
  },
  {
    title: 'Data sharing',
    body: 'We share data only with the following: Supabase (Supabase, Inc.) \u2014 our backend and hosting provider (database, authentication, and file storage). Supabase processes account data, reviews, photos, and check-in data on our behalf (supabase.com/privacy); Google Maps / Google Play services \u2014 when you open directions, coordinates are passed to Google Maps on your device, governed by Google\u2019s privacy policy; Google OAuth \u2014 if you sign in with Google, authentication is governed by Google\u2019s privacy policy (policies.google.com/privacy). We may also disclose information if required by law, regulation, or valid legal process, or to protect the rights, property, or safety of our users or others.',
  },
  {
    title: 'Data retention',
    body: 'Account data is retained for as long as your account is active. Reviews, review photos, and check-in records are retained until you delete them or request deletion. Location data is used transiently on your device and is not retained on our servers. Data may be retained longer where required for legal compliance, dispute resolution, or security purposes.',
  },
  {
    title: 'Data deletion',
    body: 'You may delete your account directly from within the App at any time. Go to Profile \u2192 Edit profile (User details) \u2192 Delete account and confirm the prompt. Deleting your account permanently removes your account, profile information, reviews, check-in records, and cloud saved lists. This cannot be undone. Locally stored data (preferences, saved-item caches, visit activity on your device) is removed when you delete your account and can also be cleared by uninstalling the App or clearing its storage. If you cannot access your account or have trouble deleting it, you may alternatively request deletion by emailing us at taracavite.app@gmail.com, and we will verify your identity and complete the request.',
  },
  {
    title: 'Security',
    body: 'We use HTTPS/TLS encryption for all data transmitted between the App and our servers. Data is stored in Supabase infrastructure with encryption at rest and access controlled by row-level security policies and authenticated access. Review photo storage is access-controlled, and photos are only served publicly as part of published reviews. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    title: 'Children\u2019s privacy',
    body: 'The App is a general-audience tourism app and is not directed to children under 13 (or the equivalent minimum age in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us at taracavite.app@gmail.com and we will delete it promptly.',
  },
  {
    title: 'Your rights',
    body: 'Depending on your jurisdiction (e.g., EEA/UK under GDPR, California under CCPA/CPRA, Philippines under the Data Privacy Act of 2012), you may have the right to: access the personal data we hold about you; request correction or deletion of your data; withdraw consent (e.g., revoke location or camera permission via device settings); object to or restrict processing; and lodge a complaint with your local data protection authority. To exercise any of these rights, contact us at taracavite.app@gmail.com.',
  },
  {
    title: 'Changes to this policy',
    body: 'We may update this Privacy Policy from time to time. When we make changes, we will update the \u201cEffective date\u201d above and, for material changes, provide notice within the App or on our store listing. Continued use of the App after changes take effect constitutes acceptance of the updated policy.',
  },
];

const CONTACT_EMAIL = 'taracavite.app@gmail.com';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen px-4 py-8 font-[Poppins,sans-serif] sm:px-6" style={{ backgroundColor: cream }}>
      <main className="mx-auto w-full max-w-2xl">
        <a href="/" className="inline-flex">
          <span className="font-[Bebas_Neue,sans-serif] text-2xl tracking-[0.06em]" style={{ color: teal }}>
            Tara, Cavite!
          </span>
        </a>

        <div className="mt-6 rounded-3xl border border-[#e4ece9] bg-white p-6 shadow-[0_4px_18px_rgba(22,53,46,0.06)] sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: ink }}>
            Privacy Policy
          </h1>
          <p
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: mint, color: teal }}
          >
            Effective date · September 17, 2026
          </p>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            This policy describes how Tara, Cavite! (“the App”) handles information when you use our mobile
            application available on Google Play. By using the App, you agree to the practices described here.
          </p>
        </div>

        <ol className="relative mt-6 space-y-4">
          {sections.map((section, index) => (
            <li key={section.title} className="relative flex gap-4">
              <div className="flex w-8 shrink-0 flex-col items-center">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: teal }}
                >
                  {index + 1}
                </span>
                {index < sections.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="mt-1 w-0 flex-1 border-l-2 border-dashed"
                    style={{ borderColor: rail }}
                  />
                ) : null}
              </div>
              <section className="min-w-0 flex-1 rounded-2xl border border-[#e4ece9] bg-white p-5 shadow-[0_4px_18px_rgba(22,53,46,0.06)]">
                <h2 className="text-base font-semibold" style={{ color: ink }}>
                  {section.title}
                </h2>
                {section.subs ? (
                  <div className="mt-3 space-y-3">
                    {section.subs.map((sub) => (
                      <div key={sub.label} className="border-l-2 border-dashed pl-3" style={{ borderColor: '#DCEBE7' }}>
                        <h3 className="text-sm font-semibold" style={{ color: ink }}>
                          <span style={{ color: teal }}>{sub.label}</span> · {sub.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">{sub.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{section.body}</p>
                )}
                {section.note ? (
                  <p className="mt-3 rounded-xl px-3 py-2 text-sm font-medium leading-relaxed" style={{ backgroundColor: mint, color: ink }}>
                    {section.note}
                  </p>
                ) : null}
              </section>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-3xl p-6 sm:p-8" style={{ backgroundColor: teal }}>
          <h2 className="text-base font-semibold text-white">11 · Contact us</h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: '#DCF2EC' }}>
            Reach us for any privacy question, concern, or request.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F1F7F6]"
            style={{ color: teal }}
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Intended to comply with Google Play’s User Data policy and Data safety requirements.
        </p>
      </main>
    </div>
  );
}
