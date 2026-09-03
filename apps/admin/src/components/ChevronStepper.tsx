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
    <ol className={styles.bar} aria-label="Content sections">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        const edge =
          index === 0 ? styles.first : index === steps.length - 1 ? styles.last : '';
        return (
          <li
            key={step.id}
            className={styles.item}
            style={{ zIndex: index === current ? 20 : steps.length - index }}
          >
            <button
              type="button"
              className={`${styles.step} ${styles[state]} ${edge}`}
              aria-current={index === current ? 'step' : undefined}
              onClick={() => onChange(index)}
            >
              <span className={styles.title}>{step.title}</span>
              <span className={styles.support}>{step.support}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
