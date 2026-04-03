"use client";

import type { ReactNode } from "react";
import styles from "../app/page.module.css";

type DashboardView = "participant" | "operator" | "activity";
type QueueFilter = "all" | "mine" | "creator" | "worker" | "resolver" | "finalizer";

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
  queueFilter: QueueFilter;
  onQueueFilterChange: (value: QueueFilter) => void;
  queueCounts: {
    creator: number;
    worker: number;
    resolver: number;
    finalizer: number;
    mine: number;
  };
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
    queueFilter,
    onQueueFilterChange,
    queueCounts,
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
          <h2>Work Agreements</h2>
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

      <div className={styles.queueBar}>
        <div className={styles.queuePills}>
          <button
            type="button"
            className={queueFilter === "all" ? styles.queuePillActive : styles.queuePill}
            aria-pressed={queueFilter === "all"}
            onClick={() => onQueueFilterChange("all")}
          >
            All
          </button>
          <button
            type="button"
            className={queueFilter === "mine" ? styles.queuePillActive : styles.queuePill}
            aria-pressed={queueFilter === "mine"}
            onClick={() => onQueueFilterChange("mine")}
          >
            Needs my action {queueCounts.mine > 0 ? `(${queueCounts.mine})` : ""}
          </button>
          <button
            type="button"
            className={queueFilter === "creator" ? styles.queuePillActive : styles.queuePill}
            aria-pressed={queueFilter === "creator"}
            onClick={() => onQueueFilterChange("creator")}
          >
            Creator {queueCounts.creator > 0 ? `(${queueCounts.creator})` : ""}
          </button>
          <button
            type="button"
            className={queueFilter === "worker" ? styles.queuePillActive : styles.queuePill}
            aria-pressed={queueFilter === "worker"}
            onClick={() => onQueueFilterChange("worker")}
          >
            Worker {queueCounts.worker > 0 ? `(${queueCounts.worker})` : ""}
          </button>
          <button
            type="button"
            className={queueFilter === "resolver" ? styles.queuePillActive : styles.queuePill}
            aria-pressed={queueFilter === "resolver"}
            onClick={() => onQueueFilterChange("resolver")}
          >
            Resolver {queueCounts.resolver > 0 ? `(${queueCounts.resolver})` : ""}
          </button>
          <button
            type="button"
            className={queueFilter === "finalizer" ? styles.queuePillActive : styles.queuePill}
            aria-pressed={queueFilter === "finalizer"}
            onClick={() => onQueueFilterChange("finalizer")}
          >
            Finalizer {queueCounts.finalizer > 0 ? `(${queueCounts.finalizer})` : ""}
          </button>
        </div>
        <p className={styles.queueHint}>
          Filter by operational role to focus on the next manual step instead of scanning every agreement.
        </p>
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
