import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function MobileOnboarding() {
  return (
    <AdminPlaceholder
      title="Onboarding (Mobile)"
      description="Edit first-run slides, permission prompts, and default tab for new installs."
      bullets={[
        'Reorder onboarding steps and imagery',
        'A/B copy for location permission rationale',
        'Reset flags for QA test accounts',
      ]}
    />
  );
}
