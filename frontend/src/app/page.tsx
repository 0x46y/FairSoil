import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.mark} />
            <div>
              <p className={styles.kicker}>FairSoil</p>
              <p className={styles.caption}>Integrity-first economy</p>
            </div>
          </div>
          <nav className={styles.nav}>
            <span>Prototype</span>
            <span className={styles.statusDot}>Live</span>
          </nav>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.badge}>MVP dashboard</p>
            <h1>
              Reward honesty, protect survival, and turn contributions into
              lasting value.
            </h1>
            <p className={styles.heroText}>
              This interface mirrors the current smart contracts: Token A decay,
              Token B rewards, and integrity score eligibility for governance.
            </p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton}>Claim UBI</button>
              <button className={styles.secondaryButton}>Connect Wallet</button>
            </div>
            <div className={styles.heroMeta}>
              <span>Network: Local simulation</span>
              <span>Last sync: 42s ago</span>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Token A balance</p>
              <p className={styles.metricValue}>1,240.50</p>
              <p className={styles.metricFootnote}>Decay: 1% / sec (demo)</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Token B assets</p>
              <p className={styles.metricValue}>12.00</p>
              <p className={styles.metricFootnote}>Minted by Treasury</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Integrity score</p>
              <p className={styles.metricValue}>142</p>
              <p className={styles.metricFootnote}>Governance eligible</p>
            </div>
          </div>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h3>Governance readiness</h3>
            <p>
              You qualify via Token B holdings or integrity score threshold.
              Next draw in 12 hours.
            </p>
            <div className={styles.cardFooter}>
              <span>Min Token B: 1</span>
              <span>Min Integrity: 100</span>
            </div>
          </article>
          <article className={styles.card}>
            <h3>Task completion</h3>
            <p>
              Report honest outcomes. Early issue reports still earn partial
              rewards.
            </p>
            <button className={styles.ghostButton}>Report Task</button>
          </article>
          <article className={styles.card}>
            <h3>Soil Treasury</h3>
            <p>
              Daily UBI set at 100 SOILA. Claims reset at 00:00 UTC.
            </p>
            <div className={styles.cardFooter}>
              <span>Next claim window: 03:12</span>
            </div>
          </article>
        </section>

        <section className={styles.timeline}>
          <div>
            <h2>Recent integrity trail</h2>
            <p>Snapshots of proofs and rewards, summarized for privacy.</p>
          </div>
          <div className={styles.timelineList}>
            <div className={styles.timelineItem}>
              <span className={styles.timelineTime}>Now</span>
              <div>
                <p className={styles.timelineTitle}>UBI claimed</p>
                <p className={styles.timelineBody}>+100 SOILA · proof logged</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.timelineTime}>2h ago</span>
              <div>
                <p className={styles.timelineTitle}>Task completed</p>
                <p className={styles.timelineBody}>+1 SOILB · +40 integrity</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.timelineTime}>Yesterday</span>
              <div>
                <p className={styles.timelineTitle}>Issue reported</p>
                <p className={styles.timelineBody}>
                  Partial reward issued · process verified
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
