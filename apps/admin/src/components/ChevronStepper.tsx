import styles from './ChevronStepper.module.css';

export type ChevronStep = {
  id: string;
  title: string;
  support: string;
};

type Props = {
  steps: ChevronStep[];
  current: number;
  onChange: (index: number) => void;
};

export function ChevronStepper({ steps, current, onChange }: Props) {
  return (
    <div className={styles.bar} role="tablist" aria-label="Content sections">
      {steps.map((step, index) => {
        const selected = index === current;
        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={selected}
            title={step.support}
            className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
            onClick={() => onChange(index)}
          >
            {step.title}
          </button>
        );
      })}
    </div>
  );
}
