import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { pitxGallery } from '../data/terminalPitx';
const olive = '#7ea00e';
const terminals = [
    {
        id: 'pitx',
        name: 'PITX',
        subtitle: 'Parañaque Integrated Terminal Exchange',
        image: pitxGallery.facade,
        blurb: "The country's first landport — safe, convenient intercity connections.",
    },
    {
        id: 'bicutan',
        name: 'Bicutan Interchange',
        subtitle: 'Taguig',
        image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80',
        blurb: 'Key staging area for buses and UV express routes toward Cavite.',
    },
];
export function TerminalsPage() {
    return (<div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-['Poppins',sans-serif] font-bold text-3xl text-neutral-900 mb-2">Terminals</h1>
        <p className="text-neutral-600 mb-10">Find landports and major transit hubs for your commute.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {terminals.map((t) => (<Link key={t.id} to={`/terminals/${t.id}`} className="group rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow">
              <div className="aspect-[16/9] bg-neutral-100">
                <img src={t.image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"/>
              </div>
              <div className="p-6">
                <h2 className="font-['Poppins',sans-serif] font-bold text-xl" style={{ color: olive }}>
                  {t.name}
                </h2>
                <p className="text-sm text-neutral-500">{t.subtitle}</p>
                <p className="text-sm text-neutral-600 mt-2">{t.blurb}</p>
                <span className="inline-block mt-4 text-sm font-semibold hover:underline" style={{ color: olive }}>
                  View terminal →
                </span>
              </div>
            </Link>))}
        </div>
      </div>
    </div>);
}
