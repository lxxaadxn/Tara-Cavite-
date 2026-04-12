import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function MobileNotifications() {
  return (
    <AdminPlaceholder
      title="Push notifications (Mobile)"
      description="Schedule and target push campaigns for the Expo/React Native app (when FCM/APNs is connected)."
      bullets={[
        'Compose broadcast or segmented pushes',
        'Deep-link into Map, Saved, or a place id',
        'View delivery stats and failure reasons',
      ]}
    />
  );
}
