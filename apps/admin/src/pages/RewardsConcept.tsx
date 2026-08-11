import { rewardEarnRules, rewardLedger, rewardRedeemables } from '../data/mockData';
import styles from './RewardsConcept.module.css';

export function RewardsConcept() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Concept draft</p>
        <h1>Rewards</h1>
        <p className={styles.lead}>
          Earn points for exploring Cavite establishments, completing itineraries, and using map
          directions — then redeem vouchers, badges, and partner perks.
        </p>
        <p className={styles.callout}>Concept draft — not wired to backend yet.</p>
      </header>

      <section className={styles.section}>
        <h2>How travelers earn</h2>
        <div className={styles.cards}>
          {rewardEarnRules.map((rule) => (
            <article key={rule.id} className={styles.card}>
              <span className={styles.points}>+{rule.points}</span>
              <h3>{rule.title}</h3>
              <p>{rule.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Redeemable rewards</h2>
        <div className={styles.grid}>
          {rewardRedeemables.map((item) => (
            <article key={item.id} className={styles.rewardCard}>
              <span className={styles.kind}>{item.kind}</span>
              <h3>{item.title}</h3>
              <p className={styles.cost}>{item.cost} pts</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Points ledger (sample)</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Points</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {rewardLedger.map((row) => (
                <tr key={row.id}>
                  <td>{row.user}</td>
                  <td>{row.action}</td>
                  <td className={row.points >= 0 ? styles.pos : styles.neg}>
                    {row.points >= 0 ? `+${row.points}` : row.points}
                  </td>
                  <td>{row.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
