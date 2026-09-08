import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SiteContentEditor } from './SiteContentEditor';
import stack from './LandingPageAdmin.module.css';

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
        {
          key: 'landing.nav',
          label: 'Header navigation labels',
          type: 'group',
          span: 2,
          fields: [
            { key: 'landing.nav.features', label: 'Nav: features' },
            { key: 'landing.nav.destinations', label: 'Nav: destinations' },
            { key: 'landing.nav.itineraries', label: 'Nav: curated itineraries', span: 2 },
          ],
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
      ]}
    />
  );
}

export function AuthLoginCmsAdmin() {
  return (
    <SiteContentEditor
      title="Login"
      intro="Welcome message for the traveler login screen."
      folder="auth"
      embedded
      fields={[{ key: 'auth.login.welcome', label: 'Welcome message', type: 'textarea', compact: true }]}
    />
  );
}

export function AuthSignupCmsAdmin() {
  return (
    <SiteContentEditor
      title="Sign up"
      intro="Terms and privacy copy on traveler sign-up."
      folder="auth"
      embedded
      fields={[
        { key: 'auth.signup.terms', label: 'Terms checkbox text', type: 'textarea', compact: true },
        { key: 'auth.signup.privacy', label: 'Privacy notice', type: 'textarea', compact: true },
      ]}
    />
  );
}

export function AuthResetCmsAdmin() {
  return (
    <SiteContentEditor
      title="Password reset"
      intro="Heading and helper text on password reset."
      folder="auth"
      embedded
      fields={[
        { key: 'auth.reset.heading', label: 'Heading' },
        { key: 'auth.reset.helper', label: 'Helper text', type: 'textarea', compact: true },
      ]}
    />
  );
}

export function BrandLogoCmsAdmin({ embedded = false }: { embedded?: boolean }) {
  return (
    <SiteContentEditor
      title="Logo"
      intro="Logo mark and brand name shown on traveler auth and header surfaces."
      folder="brand"
      embedded={embedded}
      fields={[
        {
          key: 'brand.logo_light_url',
          label: 'Logo',
          type: 'image',
          sideFields: [{ key: 'brand.name', label: 'Brand name' }],
        },
      ]}
    />
  );
}

export function BrandMetaCmsAdmin({ embedded = false }: { embedded?: boolean }) {
  return (
    <SiteContentEditor
      title="Favicon & metadata"
      intro="Controls the traveler site’s browser tab: icon, tab name, and default page description."
      folder="brand"
      embedded={embedded}
      fields={[
        {
          key: 'brand.favicon_url',
          label: 'Favicon',
          type: 'image',
          sideFields: [
            { key: 'brand.tab_title', label: 'Tab title' },
            {
              key: 'brand.meta_description',
              label: 'Metadata description',
              type: 'textarea',
              compact: true,
            },
          ],
        },
      ]}
    />
  );
}

export function AuthPagesAdmin() {
  return (
    <CmsCatch>
      <div className={stack.authPage}>
        <div className={stack.authPanel}>
          <header className={stack.authPanelHead}>
            <h2 className={stack.authPanelTitle}>Auth screens</h2>
            <p className={stack.authPanelIntro}>
              Edit traveler login, sign up, and password reset content. Each column saves on its own.
            </p>
          </header>
          <div className={stack.columns3}>
            <div className={stack.column}>
              <AuthLoginCmsAdmin />
            </div>
            <div className={stack.column}>
              <AuthSignupCmsAdmin />
            </div>
            <div className={stack.column}>
              <AuthResetCmsAdmin />
            </div>
          </div>
        </div>

        <div className={`${stack.authPanel} ${stack.authPanelSpaced}`}>
          <header className={stack.authPanelHead}>
            <h2 className={stack.authPanelTitle}>Brand Assets</h2>
            <p className={stack.authPanelIntro}>
              Logos, favicon, and tab metadata used across the traveler site and auth screens.
            </p>
          </header>
          <div className={stack.columns2}>
            <div className={stack.column}>
              <BrandLogoCmsAdmin embedded />
            </div>
            <div className={stack.column}>
              <BrandMetaCmsAdmin embedded />
            </div>
          </div>
        </div>
      </div>
    </CmsCatch>
  );
}
