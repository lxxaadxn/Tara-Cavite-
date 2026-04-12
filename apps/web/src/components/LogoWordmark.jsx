/** CaviTour wordmark — matches Figma (Pacifico-style script, olive + teal). */
export function LogoWordmark({ light = false, className = '', variant = 'script', }) {
    const olive = light ? '#b8d96a' : '#86a11d';
    const teal = light ? '#8ec5ce' : '#1f4f59';
    const fontClass = variant === 'sans'
        ? "font-['Poppins',sans-serif] font-bold text-2xl md:text-4xl leading-none tracking-tight"
        : "font-['Pacifico',cursive] text-3xl md:text-4xl leading-none";
    return (<span className={`inline-flex items-baseline select-none ${className}`}>
      <span className={fontClass} style={{ color: olive }}>
        Cavi
      </span>
      <span className={fontClass} style={{ color: teal }}>
        Tour
      </span>
    </span>);
}
