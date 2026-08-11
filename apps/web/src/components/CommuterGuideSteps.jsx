/**
 * Numbered commuter guide (corridor, signboards, last mile) — not OSRM driving turns.
 */
export function CommuterGuideSteps({ steps, loading, emptyMessage }) {
  if (loading) {
    return <p className="text-sm text-neutral-600">Building commuter guide…</p>;
  }

  if (!steps?.length) {
    return (
      <p className="text-sm text-neutral-600">
        {emptyMessage ?? 'No commuter steps yet. Turn on location and try again.'}
      </p>
    );
  }

  if (steps.length === 1 && steps[0].title?.startsWith('Loading')) {
    return <p className="text-sm text-neutral-600">{steps[0].body}</p>;
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={`${step.title}-${index}`} className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white"
            aria-hidden
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 block">
            <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{step.body}</p>
            {step.signboards?.length ? (
              <ul className="mt-2 space-y-1.5">
                {step.signboards.map((sign) => (
                  <li
                    key={sign}
                    className="rounded-md border border-[#7ea00e]/30 bg-[#7ea00e]/8 px-2.5 py-1.5 text-sm font-medium text-neutral-800"
                  >
                    Sign to look for: &ldquo;{sign}&rdquo;
                  </li>
                ))}
              </ul>
            ) : null}
            {step.hint ? <p className="mt-2 text-xs leading-relaxed text-neutral-500">{step.hint}</p> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
