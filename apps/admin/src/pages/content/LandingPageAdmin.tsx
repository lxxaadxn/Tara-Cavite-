import { useState } from 'react';
import { ChevronStepper } from '../../components/ChevronStepper';
import {
  CmsCatch,
  LandingFeaturesAdmin,
  LandingFooterAdmin,
  LandingHeroAdmin,
  LandingWhyAdmin,
} from './ContentCmsPages';
import { LandingDestinationsCatalogAdmin, LandingItinerariesCatalogAdmin } from './LandingCatalogPicks';
import styles from './LandingPageAdmin.module.css';

const LANDING_STEPS = [
  { id: 'hero', title: 'Hero', support: 'Photo, headline, and CTA' },
  { id: 'why', title: 'Why', support: 'Pills and Live Updates' },
  { id: 'features', title: 'Features', support: 'Capability cards' },
  { id: 'catalog', title: 'Catalog', support: 'Destinations and itineraries' },
  { id: 'footer', title: 'Footer', support: 'Tagline, contact, and nav' },
];

export function LandingPageAdmin() {
  const [step, setStep] = useState(0);

  return (
    <CmsCatch>
    <div className={styles.stack}>
      <ChevronStepper steps={LANDING_STEPS} current={step} onChange={setStep} />

      {step === 0 ? (
        <div className={styles.section}>
          <LandingHeroAdmin />
        </div>
      ) : null}

      {step === 1 ? (
        <div className={styles.section}>
          <LandingWhyAdmin />
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.section}>
          <LandingFeaturesAdmin />
        </div>
      ) : null}

      {step === 3 ? (
        <>
          <div className={styles.section}>
            <LandingDestinationsCatalogAdmin />
          </div>
          <div className={styles.section}>
            <LandingItinerariesCatalogAdmin />
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <div className={styles.section}>
          <LandingFooterAdmin />
        </div>
      ) : null}
    </div>
    </CmsCatch>
  );
}
