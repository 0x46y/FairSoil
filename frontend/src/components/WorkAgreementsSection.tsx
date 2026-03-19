"use client";

import type { ReactNode } from "react";
import styles from "../app/page.module.css";

type DashboardView = "participant" | "operator";

type CovenantOverview = {
  total: number;
  active: number;
  disputed: number;
  awaitingAction: number;
};

export function WorkAgreementsSection(props: {
  covenantTagFilter: string;
  onCovenantTagFilterChange: (value: string) => void;
  onRefresh: () => void;
  missingEnv: boolean;
  isLoadingCovenants: boolean;
  dashboardView: DashboardView;
  onlyFlaggedAgreements: boolean;
  onToggleOnlyFlagged: () => void;
  onExportReviewCsv: () => void;
  visibleCount: number;
  covenantOverview: CovenantOverview;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  const {
    covenantTagFilter,
    onCovenantTagFilterChange,
    onRefresh,
    missingEnv,
    isLoadingCovenants,
    dashboardView,
    onlyFlaggedAgreements,
    onToggleOnlyFlagged,
    onExportReviewCsv,
    visibleCount,
    covenantOverview,
    isEmpty,
    emptyMessage,
    children,
  } = props;

  return (
    <section className={styles.covenantSection}>
      <div className={styles.covenantHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Main work flow</span>
          <h2>Work agreements</h2>
          <p>See what each agreement is waiting for and who needs to act next.</p>
        </div>
        <div className={styles.covenantHeaderActions}>
          <input
            className={styles.covenantSearch}
            value={covenantTagFilter}
            onChange={(event) => onCovenantTagFilterChange(event.target.value)}
            placeholder="Filter by tag…"
            aria-label="Filter agreements by tag"
            name="covenantTagFilter"
            autoComplete="off"
          />
          <button
            className={styles.secondaryButton}
            onClick={onRefresh}
            disabled={missingEnv || isLoadingCovenants}
          >
            Refresh agreements
          </button>
          {dashboardView === "operator" ? (
            <button className={styles.secondaryButton} onClick={onToggleOnlyFlagged}>
              {onlyFlaggedAgreements ? "Show all agreements" : "Only flagged agreements"}
            </button>
          ) : null}
          {dashboardView === "operator" ? (
            <button
              className={styles.secondaryButton}
              onClick={onExportReviewCsv}
              disabled={visibleCount === 0}
            >
              Export review CSV
            </button>
          ) : null}
        </div>
      </div>

      {dashboardView === "operator" ? (
        <p className={styles.fieldHint}>
          Operator view sorts agreements by review-priority tags first, then by newest agreement.
          {onlyFlaggedAgreements ? " Only agreements with review or relationship warnings are shown." : ""}
        </p>
      ) : null}

      <div className={styles.covenantStats}>
        <div className={styles.covenantStatCard}>
          <span className={styles.auditLabel}>All agreements</span>
          <span className={styles.auditValue}>{covenantOverview.total}</span>
        </div>
        <div className={styles.covenantStatCard}>
          <span className={styles.auditLabel}>Still in progress</span>
          <span className={styles.auditValue}>{covenantOverview.active}</span>
        </div>
        <div className={styles.covenantStatCard}>
          <span className={styles.auditLabel}>In dispute</span>
          <span className={styles.auditValue}>{covenantOverview.disputed}</span>
        </div>
        <div className={styles.covenantStatCard}>
          <span className={styles.auditLabel}>Need action now</span>
          <span className={styles.auditValue}>{covenantOverview.awaitingAction}</span>
        </div>
      </div>

      <div className={styles.covenantTable}>
        <div className={styles.covenantRowHeader}>
          <span>#</span>
          <span>Worker</span>
          <span>Reward</span>
          <span>Creator share</span>
          <span>Trust score</span>
          <span>Worker claim</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {isEmpty ? <div className={styles.covenantRowEmpty}>{emptyMessage}</div> : children}
      </div>
    </section>
  );
}
