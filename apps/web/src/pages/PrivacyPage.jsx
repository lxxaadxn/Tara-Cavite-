import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F1F7F6] font-['Poppins',sans-serif]">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1150px] px-4 py-7 sm:px-6 lg:px-8">
        <p className="text-sm">
          <Link to="/" className="font-semibold text-[#1B8A70] hover:underline">
            Home
          </Link>
          {' · '}
          <Link to="/terms" className="font-semibold text-[#1B8A70] hover:underline">
            Terms of Use
          </Link>
          {' · '}
          <Link to="/profile" className="font-semibold text-[#1B8A70] hover:underline">
            Profile
          </Link>
        </p>
        <h1 className="mt-3 font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Privacy</h1>

        <section className="mt-5 max-w-xl rounded-[28px] bg-white p-5 sm:p-6">
          <h2 className="font-['Poppins',sans-serif] text-base font-semibold text-neutral-900">Saved list visibility</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Each saved list can be private or public. You choose that when you create or edit a list — there is no
            separate account-wide privacy switch yet.
          </p>
          <Link
            to="/saved"
            className="mt-4 inline-flex rounded-full bg-[#D4EFE8] px-4 py-2 text-sm font-semibold text-[#1B8A70] transition hover:bg-[#C8EBDD]"
          >
            Manage saved lists
          </Link>
        </section>

        <section className="mt-4 max-w-xl rounded-[28px] bg-white p-5 sm:p-6">
          <h2 className="font-['Poppins',sans-serif] text-base font-semibold text-neutral-900">Public profile</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            A public traveler profile is not available yet. Your name, photo, and travel interests stay on your
            account until that option is added.
          </p>
        </section>
      </main>
    </div>
  );
}
