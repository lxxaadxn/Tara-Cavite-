import { ItineraryAiChat } from '../../components/ItineraryAiChat';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import styles from './ItineraryAiPage.module.css';

export function ItineraryAiPage() {
  usePageHeader('AI Itinerary Generator', null);

  return (
    <div className={styles.page}>
      <ItineraryAiChat fullPage />
    </div>
  );
}
