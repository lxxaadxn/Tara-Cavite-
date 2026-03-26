import { useMemo } from 'react';
import { RandomIcon } from './RandomIcon';

const ICON_COLOR_CLASS = 'ft-titleIcon';

export function TitleScreen() {
  const year = useMemo(() => '2026', []);

  return (
    <main className="ft-screen ft-titleScreen" role="main" aria-label="Title Screen">
      <div className="ft-titleCard" role="region" aria-label="CaviTour title">
        <div className="ft-titleLogoWrap">
          <div className="ft-titleLogo" aria-label="CaviTour">
            CaviTour
          </div>
        </div>

        <div className="ft-titleIconWrap" aria-hidden="true">
          <div className={ICON_COLOR_CLASS}>
            <RandomIcon />
          </div>
        </div>

        <div className="ft-titleFooter" aria-label="Copyright">
          © CaviTour {year}
        </div>
      </div>
    </main>
  );
}

