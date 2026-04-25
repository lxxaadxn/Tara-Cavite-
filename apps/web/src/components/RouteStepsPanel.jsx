const olive = '#7ea00e';
const teal = '#1f4f59';
export function RouteStepsPanel({ steps, className = '', directionsUrl }) {
    return (<div className={`bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 ${className}`}>
      <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-neutral-800 mb-6">Route Steps</h2>
      <p className="text-xs text-neutral-500 mb-4 -mt-2">
        Illustrative steps — open the link below for routing on OpenStreetMap (OSRM). Set your starting point on the map if needed.
      </p>
      <ol className="relative">
        {steps.map((step, i) => {
            const last = i === steps.length - 1;
            const first = i === 0;
            const solid = first || last;
            return (<li key={i} className="relative flex gap-4 pb-8 last:pb-0">
              {!last ? (<div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-neutral-200" aria-hidden/>) : null}
              <div className="relative z-[1] shrink-0 mt-1">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${solid ? '' : 'bg-white'}`} style={solid
                    ? { backgroundColor: olive, borderColor: olive }
                    : { borderColor: 'rgba(126, 160, 14, 0.7)' }}>
                  {solid ? <span className="w-2 h-2 rounded-full bg-white"/> : null}
                </div>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-['Poppins',sans-serif] font-bold text-neutral-900">{step.title}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{step.sub}</p>
                {step.tag === 'Bus' ? (<span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                    🚌 Bus
                  </span>) : null}
                {step.tag === 'Tricycle' ? (<span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: teal }}>
                    🛺 Tricycle
                  </span>) : null}
              </div>
            </li>);
        })}
      </ol>
      {directionsUrl ? (<p className="mt-6 pt-4 border-t border-neutral-100">
          <a href={directionsUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline" style={{ color: olive }}>
            Open directions on OpenStreetMap.org →
          </a>
        </p>) : null}
    </div>);
}
