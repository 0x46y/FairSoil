"use client";

import styles from "./TopDashboardChrome.module.css";

type DashboardView = "participant" | "operator" | "activity";
type Tone = "ready" | "warning" | "muted";

export function TopDashboardChrome(props: {
  connectionLabel: string;
  connectionDetail: string;
  connectionTone: Tone;
  chainId?: number;
  accountAddress?: string;
  txError: string | null;
  txSuccess: string | null;
  missingEnv: boolean;
  claimDisabled: boolean;
  claimLabel: string;
  claimHelperText: string | null;
  onClaim: () => void;
  onDisconnect: () => void;
  onConnect: () => void;
  formattedTokenA: string;
  formattedTokenB: string;
  formattedTokenBUnlocked: string;
  formattedTokenBLocked: string;
  formattedIntegrity: string;
  formattedAvailableIntegrity: string;
  formattedLockedIntegrity: string;
  governanceEligible: boolean;
  defenseQuotaRemaining: number | null;
  defenseQuotaResetLabel?: string | null;
  dashboardView: DashboardView;
  onSelectDashboardView: (view: DashboardView) => void;
}) {
  const {
    connectionLabel,
    connectionDetail,
    connectionTone,
    chainId,
    accountAddress,
    txError,
    txSuccess,
    missingEnv,
    claimDisabled,
    claimLabel,
    claimHelperText,
    onClaim,
    onDisconnect,
    onConnect,
    formattedTokenA,
    formattedTokenB,
    formattedTokenBUnlocked,
    formattedTokenBLocked,
    formattedIntegrity,
    formattedAvailableIntegrity,
    formattedLockedIntegrity,
    governanceEligible,
    defenseQuotaRemaining,
    defenseQuotaResetLabel,
    dashboardView,
    onSelectDashboardView,
  } = props;

  const toneClassName =
    connectionTone === "ready"
      ? styles.toneReady
      : connectionTone === "warning"
      ? styles.toneWarning
      : styles.toneMuted;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark} />
          <div className={styles.brandText}>
            <p className={styles.kicker}>FairSoil</p>
            <p className={styles.caption}>Integrity-first economy</p>
          </div>
        </div>
        <nav className={styles.nav}>
          <span className={styles.navLabel}>Local MVP</span>
          <span className={`${styles.navBadge} ${toneClassName}`}>
            <span className={styles.navBadgeDot} />
            <span className={styles.navBadgeLabel}>{connectionLabel}</span>
          </span>
        </nav>
      </header>

      {txError ? (
        <section className={styles.messageError} role="alert">
          <strong className={styles.messageTitle}>Action could not finish</strong>
          <p className={styles.messageBody}>{txError}</p>
        </section>
      ) : null}
      {txSuccess ? (
        <section className={styles.messageSuccess} role="status" aria-live="polite">
          <strong className={styles.messageTitle}>Action completed</strong>
          <p className={styles.messageBody}>{txSuccess}</p>
        </section>
      ) : null}

      {missingEnv ? (
        <section className={styles.missingEnv}>
          <h2>Setup is incomplete</h2>
          <p>
            This page cannot send transactions yet because contract addresses are missing. Set
            ` NEXT_PUBLIC_TOKENA_ADDRESS`, ` NEXT_PUBLIC_TOKENB_ADDRESS`, ` NEXT_PUBLIC_TREASURY_ADDRESS`,
            and ` NEXT_PUBLIC_COVENANT_ADDRESS` in `frontend/.env.local`.
          </p>
        </section>
      ) : null}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.badge}>Phase 1 MVP</div>
          <div className={styles.heroHeading}>
            <h1>Connect your wallet, verify it, and begin using FairSoil.</h1>
            <p className={styles.heroText}>
              This page is a working prototype. In plain terms: Token A is your daily bonus, Token B is your work
              reward, and Integrity is your trust score.
            </p>
          </div>
          <div className={styles.phaseNote}>
            <p>
              <strong>What this MVP already does:</strong> daily bonus, reward
              escrow, approval, dispute flow, manual operator review, and basic treasury checks.
            </p>
            <p>
              <strong>What is still not finished:</strong> full DAO governance,
              production identity flow, and external dispute arbitration.
            </p>
            <p>
              <strong>What we are still testing:</strong> dispute fairness for
              low-balance users. Phase 1 keeps a manual arbiter, while Phase 2 is expected to move high-value cases
              to outside adjudication.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.primaryAction} onClick={onClaim} disabled={claimDisabled}>
              {claimLabel}
            </button>
            {accountAddress ? (
              <button className={styles.secondaryAction} onClick={onDisconnect}>Disconnect wallet</button>
            ) : (
              <button className={styles.secondaryAction} onClick={onConnect}>Connect wallet</button>
            )}
          </div>
          {claimHelperText ? (
            <p className={styles.helperNote}>{claimHelperText}</p>
          ) : null}
          <div className={styles.heroMeta}>
            <span className={styles.heroMetaStrong}>Network: {chainId === undefined ? "Not connected" : `Chain ${chainId}`}</span>
            <span className={styles.heroMetaStrong}>Wallet: {accountAddress ? accountAddress.slice(0, 10) : "Not connected"}</span>
            <span>{connectionDetail}</span>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.metric}>
            <div className={styles.metricInner}>
              <p className={styles.metricLabel}>Daily Bonus (Token A)</p>
              <p className={styles.metricValue}>{formattedTokenA}</p>
              <p className={styles.metricFootnote}>
                This slowly expires over time, so it is meant for near-term use.
              </p>
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricInner}>
              <p className={styles.metricLabel}>Work Rewards (Token B)</p>
              <p className={styles.metricValue}>{formattedTokenB}</p>
              <div className={styles.metricBreakdown}>
                <span>Unlocked: {formattedTokenBUnlocked}</span>
                <span>Locked: {formattedTokenBLocked}</span>
              </div>
              <p className={styles.metricFootnote}>Locked rewards are already reserved inside agreements.</p>
            </div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricInner}>
              <p className={styles.metricLabel}>Trust Score (Integrity)</p>
              <p className={styles.metricValue}>{formattedIntegrity}</p>
              <div className={styles.metricBreakdown}>
                <span>Available: {formattedAvailableIntegrity}</span>
                <span>Locked: {formattedLockedIntegrity}</span>
              </div>
              <p className={styles.metricFootnote}>
                {governanceEligible ? "You can join governance decisions." : "You have not reached the governance threshold yet."}
              </p>
              {defenseQuotaRemaining !== null ? (
                <p className={styles.metricFootnote}>
                  Defense quota: {defenseQuotaRemaining}/2 remaining
                  {defenseQuotaResetLabel ? ` · resets in ${defenseQuotaResetLabel}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Dashboard sections" className={styles.viewTabs}>
        <div className={styles.tabList} role="tablist" aria-label="Choose dashboard view">
          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === "participant"}
            aria-controls="dashboard-panel-participant"
            className={`${styles.tabButton} ${dashboardView === "participant" ? styles.tabButtonActive : ""}`}
            onClick={() => onSelectDashboardView("participant")}
          >
            Use FairSoil
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === "operator"}
            aria-controls="dashboard-panel-operator"
            className={`${styles.tabButton} ${dashboardView === "operator" ? styles.tabButtonActive : ""}`}
            onClick={() => onSelectDashboardView("operator")}
          >
            Run FairSoil
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === "activity"}
            aria-controls="dashboard-panel-activity"
            className={`${styles.tabButton} ${dashboardView === "activity" ? styles.tabButtonActive : ""}`}
            onClick={() => onSelectDashboardView("activity")}
          >
            Activity
          </button>
        </div>
        <p className={styles.tabDescription}>
          {dashboardView === "participant"
            ? "Participant view is the default. It shows the everyday flow: verify, collect bonuses, and create agreements."
            : dashboardView === "activity"
            ? "Activity view keeps the audit trail separate from the main work flow, with filters, export, and paging."
            : "Operator view is for the temporary operator wallet, manual reviewers, and the dispute arbiter."}
        </p>
      </section>
    </>
  );
}
