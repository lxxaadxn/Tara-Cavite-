
export function LogoWordmark({ light = false, className = '' }) {
  const olive = light ? '#b8d96a' : '#86a11d';
  const teal = light ? '#8ec5ce' : '#1f4f59';
  const fontClass = "font-['Pacifico',cursive]";

  return (
    <span className={`inline-flex items-baseline select-none ${fontClass} ${className}`}>
      <span className="text-2xl md:text-3xl leading-none" style={{ color: olive }}>
        Tara
      </span>
      <span className="text-2xl md:text-3xl leading-none" style={{ color: teal }}>
        , Cavite!
      </span>
    </span>
  );
}
