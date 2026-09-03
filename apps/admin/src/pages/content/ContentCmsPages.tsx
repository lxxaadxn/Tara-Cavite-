import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { ChevronStepper } from '../../components/ChevronStepper';
import { SiteContentEditor } from './SiteContentEditor';
import stack from './LandingPageAdmin.module.css';

const AUTH_STEPS = [
  { id: 'login', title: 'Login', support: 'Welcome and banner' },
  { id: 'signup', title: 'Sign up', support: 'Terms and privacy' },
  { id: 'reset', title: 'Password reset', support: 'Heading and helper copy' },
];

const BRAND_STEPS = [
  { id: 'logo', title: 'Logo', support: 'Light and dark marks' },
  { id: 'meta', title: 'Favicon & metadata', support: 'Tab name, icon, and description' },
];

export class CmsCatch extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null };
  static getDerivedStateFromError(err: Error) {
    return { message: err.message || 'Could not render this page.' };
  }
  componentDidCatch(err: Error, _info: ErrorInfo) {
    console.warn(err);
  }
  render() {
    if (this.state.message) {
      return (
        <p style={{ margin: 0, padding: 8, color: '#b91c1c', fontSize: 14 }}>{this.state.message}</p>
      );
    }
    return this.props.children;
  }
}

export function LandingHeroAdmin() {
  return (
    <SiteContentEditor
      folder="landing"
      layout="twoColumn"
      fields={[
        { key: 'landing.hero.headline', label: 'Headline', span: 2 },
        { key: 'landing.hero.subtitle', label: 'Subtitle', type: 'textarea', span: 2 },
        { key: 'landing.hero.cta', label: 'CTA button text' },
        { key: 'landing.hero.cta_href', label: 'CTA link', hint: 'Internal path such as /signup' },
        { key: 'landing.hero.image_url',
          label: 'Hero image',
          type: 'image',
          span: 2,
          altKey: 'landing.hero.image_alt',
          altLabel: 'Hero image alt text',
        },
      ]}
    />
  );
}

export function LandingWhyAdmin() {
  return (
    <SiteContentEditor
      folder="landing"
      layout="twoColumn"
      fields={[
        { key: 'landing.why.heading', label: 'Heading' },
        { key: 'landing.why.body', label: 'Body', type: 'textarea', span: 2 },
        { key: 'landing.why.stat_establishments', label: 'Establishments stat label' },
        { key: 'landing.why.stat_municipalities', label: 'Municipalities stat label' },
        { key: 'landing.why.stat_routes', label: 'Day routes stat label' },
        { key: 'landing.why.stat_users', label: 'Active users stat label' },
      ]}
    />
  );
}

export function LandingFeaturesAdmin() {
  return (
    <SiteContentEditor
      folder="landing"
      layout="twoColumn"
      fields={[
        { key: 'landing.features.heading', label: 'Section heading', span: 2 },
        ...([1, 2, 3, 4] as const).map((i) => ({
          key: `landing.features.${i}.image_url`,
          label: `Card ${i}`,
          type: 'featureCard' as const,
          span: 2 as const,
          titleKey: `landing.features.${i}.title`,
          titleLabel: 'Title',
          bodyKey: `landing.features.${i}.body`,
          bodyLabel: 'Description',
          urlLabel: 'Photo',
        })),
      ]}
    />
  );
}

export function LandingFooterAdmin() {
  return (
    <SiteContentEditor
      folder="landing"
      layout="twoColumn"
      fields={[
        { key: 'landing.footer.tagline', label: 'Tagline', type: 'textarea' },
        { key: 'landing.footer.copyright', label: 'Copyright' },
        { key: 'landing.footer.contact_email', label: 'Contact email' },
        { key: 'landing.footer.contact_phone', label: 'Contact phone' },
        { key: 'landing.nav.features', label: 'Nav: features' },
        { key: 'landing.nav.destinations', label: 'Nav: destinations' },
        { key: 'landing.nav.itineraries', label: 'Nav: curated itineraries', span: 2 },
      ]}
    />
  );
}

export function AuthLoginCmsAdmin() {
  return (
    <SiteContentEditor
      title="Login"
      intro="Welcome message and optional banner on the traveler login screen."
      folder="auth"
      fields={[
        { key: 'auth.login.welcome', label: 'Welcome message', type: 'textarea' },
        { key: 'auth.login.banner_url', label: 'Banner image', type: 'image' },
      ]}
    />
  );
}

export function AuthSignupCmsAdmin() {
  return (
    <SiteContentEditor
      title="Sign up"
      intro="Terms checkbox text and privacy notice on traveler sign-up."
      fields={[
        { key: 'auth.signup.terms', label: 'Terms checkbox text', type: 'textarea' },
        { key: 'auth.signup.privacy', label: 'Privacy notice', type: 'textarea' },
      ]}
    />
  );
}

export function AuthResetCmsAdmin() {
  return (
    <SiteContentEditor
      title="Password reset"
      intro="Heading and helper copy on the password reset screen."
      fields={[
        { key: 'auth.reset.heading', label: 'Heading' },
        { key: 'auth.reset.helper', label: 'Helper text', type: 'textarea' },
      ]}
    />
  );
}

export function BrandLogoCmsAdmin() {
  return (
    <SiteContentEditor
      title="Logo"
      intro="Optional image logos for light and dark surfaces. Empty values keep the Tara, Cavite! wordmark."
      folder="brand"
      fields={[
        { key: 'brand.logo_light_url', label: 'Light-mode logo', type: 'image' },
        { key: 'brand.logo_dark_url', label: 'Dark-mode logo', type: 'image' },
      ]}
    />
  );
}

export function BrandMetaCmsAdmin() {
  return (
    <SiteContentEditor
      title="Favicon & metadata"
      intro="Controls the traveler site’s browser tab: icon, tab name, and default page description."
      folder="brand"
      fields={[
        { key: 'brand.tab_title', label: 'Tab title' },
        { key: 'brand.favicon_url', label: 'Favicon', type: 'image' },
        { key: 'brand.meta_description', label: 'Metadata description', type: 'textarea' },
      ]}
    />
  );
}

export function AuthPagesAdmin() {
  const [step, setStep] = useState(0);
  return (
    <CmsCatch>
      <div className={stack.stack}>
        <ChevronStepper steps={AUTH_STEPS} current={step} onChange={setStep} />
        <div className={stack.section}>
          {step === 0 ? <AuthLoginCmsAdmin /> : null}
          {step === 1 ? <AuthSignupCmsAdmin /> : null}
          {step === 2 ? <AuthResetCmsAdmin /> : null}
        </div>
      </div>
    </CmsCatch>
  );
}

export function BrandAssetsAdmin() {
  const [step, setStep] = useState(0);
  return (
    <CmsCatch>
      <div className={stack.stack}>
        <ChevronStepper steps={BRAND_STEPS} current={step} onChange={setStep} />
        <div className={stack.section}>
          {step === 0 ? <BrandLogoCmsAdmin /> : null}
          {step === 1 ? <BrandMetaCmsAdmin /> : null}
        </div>
      </div>
    </CmsCatch>
  );
}
