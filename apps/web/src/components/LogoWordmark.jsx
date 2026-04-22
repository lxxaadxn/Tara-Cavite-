/** CaviTour wordmark — matches Figma (Pacifico-style script, olive + teal). */
export function LogoWordmark({ light = false, className = '', variant = 'script', }) {
    const olive = light ? '#b8d96a' : '#86a11d';
    const teal = light ? '#8ec5ce' : '#1f4f59';
    const scriptClass = variant === 'sans'
        ? "font-['Poppins',sans-serif] font-bold"
        : "font-['Pacifico',cursive]";
    const aviClass = "font-['Poppins',sans-serif] font-semibold";
    return (<span className={`inline-flex items-baseline select-none ${className}`}>
      <span className={`${scriptClass} text-2xl md:text-3xl leading-none`} style={{ color: olive }}>
        C
      </span>
      <span className={`${aviClass} text-xl md:text-2xl leading-none`} style={{ color: olive }}>
        avi
      </span>
      <span className={`${scriptClass} text-2xl md:text-3xl leading-none`} style={{ color: teal }}>
        Tour
      </span>
    </span>);
}
