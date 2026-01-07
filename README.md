# FairSoil

FairSoil is a decentralized Universal Basic Income (UBI) protocol designed to cultivate a "fair soil" where integrity and honesty are rewarded, rather than short-term exploitation or cost externalization.

## Vision
To create a digital economic foundation where:
- Being "honest" and "reliable" is economically advantageous.
- Everyone has the "freedom to refuse" undesirable work through UBI.
- Socially essential but difficult/dangerous tasks are fairly rewarded through dynamic incentives.

### System vs Law (Boundary Design)
- **Role split:** FairSoil focuses on incentives: "honest people should not lose," "record unreasonable exploitation," and "distribute UBI." Physical enforcement such as violence prevention or land registration is handled by real-world law and institutions.
- **Law as oracle:** Court decisions and similar judgments are imported as external data and reflected in scores and evaluations to preserve flexibility.
- **Effect:** Avoids a rigid programmatic dystopia while maintaining consistency with real society.

## Core Mechanisms

### 1. Dual Token System
- **Token A (Flow):** A "decaying" currency for daily transactions.
  - Distributed daily to all verified humans.
  - Automatically loses value/amount over time (e.g., 30-day half-life) to encourage circulation.
- **Token B (Asset):** A permanent value store.
  - Earned through high-integrity actions and socially essential contributions.
  - Cannot be obtained through simple hoarding of Token A.

### 2. Integrity-Based Evaluation
- Rewards are based on "integrity" (not just "doing good," but "not cheating").
- Penalizes "cost externalization" (pushing risks/costs onto others).
- Uses Proof of Process to verify that safety and procedural standards were met.

### 3. Sybil Resistance
- Integrated with **World ID** to ensure each participant is a unique human being.

### 4. Dynamic Incentives for Essential Tasks
- Automated reward scaling for emergency, high-risk, or essential tasks (e.g., disaster relief, healthcare) where supply is low.

## Specifications (Draft)

### Economic and Distribution
#### 1. Hybrid Dynamic Rewards and Public Pool (Infrastructure and Emergencies)
- **Emergency tasks (Type A):** "Start at the maximum reward and decay over time." The fastest responder earns the highest honor and reward.
- **Infrastructure / 3K tasks (Type B):** Ongoing maintenance. Rewards rise when no one takes it, but priority notifications to proven workers prevent a chicken race.
- **Funding (Soil Treasury):** Public infrastructure rewards are minted from system-wide decay (burn) to prevent individual bankruptcy while balancing inflation.

#### 2. Human Limits and Technology Investment Protocol (When Money Cannot Solve It)
- **Spec:** If a task is so high-risk/high-load that no one accepts even at the system cap, the system automatically flags it as "human execution prohibited."
- **Investment shift:** The elevated reward is redirected from wages to funding automation/robotics.
- **Philosophy:** Do not force humans to sell their lives. If tech cannot catch up, the system encourages closing/abandoning the infrastructure rather than sacrificing people.

#### 3. Unconditional UBI as "Slack"
- **Spec:** Token A distribution is not tied to integrity score or labor performance.
- **Purpose:** Guarantee survival even when people are too tired to be "superhuman."
- **Effect:** Even if rewards are high, people can say "no" to unwanted work because financial anxiety is removed.

#### 4. Visualizing Exploitative Workload and Unreasonable Demands
- **Spec:** Contracts must state estimated effort and rest/holiday rules. If actual workload or deadline pressure far exceeds the estimate, it is recorded as an Issue and the employer score drops.
- **Effect:** Employer behavior becomes transparent, so exploitative employers lose workers (especially those with UBI-backed freedom).

#### 5. On-Chain "Success Rate / Retention Rate" Statistics
- **Spec:** Automatically track how many people tried, how many dropped out, and average retention per employer.
- **Effect:** Identifies projects that "look funded" but have high churn, allowing workers to defend themselves in advance.

#### 6. Shift from "Completion Liability" to "Honest Process (Time)"
- **Spec:** Pay for time spent correctly following agreed procedures, not just outcomes. If a task is structurally impossible, early discovery and reporting earns near-completion rewards.
- **Effect:** Eliminates dishonest management such as "I didn't know" or "hide it until the end," and encourages early debugging.

#### 7. Incentives for "Building Things That Last"
- **Spec:** As long as a product continues to be used (not replaced), the creator receives ongoing maintenance rewards from the Soil Treasury.
- **Visible depreciation:** Record predicted durability; if actual lifespan exceeds it, grant integrity score bonuses.
- **Effect:** Rewards long-term quality instead of one-off sales.

#### 8. Eliminating Information Asymmetry (Disclose What Sellers Want Hidden)
- **Spec:** Attach durability, repair history, and depreciation trends as NFTs (or metadata) to products/services.
- **Effect:** Buyers can see information sellers might want to hide ("breaks quickly," "poor maintainability").

#### 9. Resource Liquidity and Anti-Monopoly (Resource Liquidity)
- **Spec:** Owners self-assess and publish value for physical resources (land, critical infrastructure), and continuously pay a "soil return tax (Token B)" to the Soil Treasury based on that valuation.
- **Harberger Tax:** Higher valuation increases tax burden; lower valuation allows others to buy at that price. Keeps valuations aligned with market reality.
- **Deposit model:** When holding a resource, lock Token B as relocation/guarantee deposit. Refusal to transfer or violation triggers forfeiture and strong integrity penalties.
- **Two-layer enforcement:** On-chain transfers usage rights/revenue immediately; off-chain enforcement uses legal oracles for registration/physical possession.
- **Effect:** Concentration of wealth becomes costly and resources flow to optimal users.

#### 10. Productivity-Backed Value (Productivity-backed Value)
- **Spec:** Token B issuance is linked to verified real-world value (infrastructure recovery, quality products).
- **Verification model:** Use Proof of Process with signed logs/sensor data for automatic checks. Disputes trigger decentralized post-audit; fraud slashes deposits.
- **Effect:** Aligns issuance with productivity and maintains trust against external currencies.

#### 11. Progressive Decay and Survival Buffer (Progressive Decay & Survival Buffer)
- **Spec:** No decay for the basic balance equal to minimum living cost (0%). Dynamic decay applies only to surplus assets.
- **Uniqueness:** Survival Buffer applies only to a World ID verified primary address; unverified addresses always decay.
- **Effect:** Prevents stability costs from falling on everyday people while enabling redistribution and circulation.

#### 12. Purchasing Power Oracle (Purchasing Power Oracle)
- **Spec:** Track external price indices (e.g., CPI) and auto-adjust Token A distribution.
- **Supply control:** When distribution increases, decay rate is raised in sync. Upper/lower bounds limit short-term volatility.
- **Effect:** UBI retains real purchasing power during inflation.

#### 13. Emergency Advance Protocol (Emergency Advance Protocol)
- **Spec:** During disasters, allow temporary large issuance as an advance on future decay (return). A recovery schedule is fixed at issuance.
- **Recovery control:** Use dynamic conditions (price/FX stability) rather than fixed deadlines. Accelerate recovery during overheating, slow during headwinds.
- **Cap:** Set issuance limits or ratio caps to prevent abuse.
- **Effect:** Saves short-term crises while preserving long-term stability (mean reversion).

#### 14. Targeted Support for Integrity (Targeted Support for Integrity)
- **Spec:** Users with 30-day average asset balance below a threshold and integrity score above a threshold receive increased next-day distribution. Average balance uses Token A + Token B (Token B at market value). Token B is valued by a 30-day TWAP from decentralized oracles (e.g., Chainlink).
- **Smoothing:** Use moving averages to prevent flash-poverty attacks.
- **Opaque loss definition:** Exclude users who show concentrated, unexplained large transfers/burns outside contracts or verified payments.
- **Legitimate emergency spending:** Spending tied to special contract types (healthcare/welfare, education/research, infrastructure/survival, disaster/emergency, public goods) does not count as waste.
- **Examples:** Healthcare/welfare (treatment, medicine, care), education/research (tuition, books, pioneer royalties), infrastructure/survival (rent, utilities, telecom), disaster/emergency (recovery, incident response), public goods (community maintenance, environmental protection).
- **Appeal:** Appeals use ZKP evidence and DAO review to protect privacy.
- **Effect:** Avoids subsidizing waste while supporting honest people in hardship; replaces negative income tax/refunds with real-time, zero-admin processing.

#### 15. Investment over Interest (Investment over Interest)
- **Spec:** No passive deposit interest. Instead, stake Token B into specific tasks or R&D (first penguin) and receive outcome rewards or durability royalties.
- **Eligibility:** Only templates with evaluation hash above a minimum threshold and verified integrity history qualify.
- **Risk:** Violations or fraud result in slashing.
- **Effect:** Keeps assets circulating toward social value creation.

#### 16. Integrity-based Advance (Integrity-based Advance)
- **Spec:** Verified participants can receive interest-free advances from the Soil Treasury up to contracted task rewards. Limits scale with integrity score.
- **Tier example:** Initial 10% -> mid 30% -> high 50% -> top 80%.
- **Cap design:** Use a diminishing upper bound to prevent credit inflation.
- **Anti-absconding:** If tasks are not fulfilled, unpaid balances are deducted from future UBI (Token A). The Survival Buffer is exempt.
- **Restart limits:** New advances are locked until repayment; World ID prevents evasion.
- **Effect:** Provides baseline credit for newcomers while expanding opportunity based on track record.

#### 17. Resource Quota & Dynamic Pricing (Resource Quota & Dynamic Pricing)
- **Congestion pricing:** Raise return tax rates as demand concentrates for land, water, energy, and other physical resources.
- **Survival quota protection:** Guarantee low-cost minimum use; apply progressive Token B costs to excess.
- **Examples:** Land (minimum housing/farming space), water (basic life usage), energy (minimum lighting/cooking/climate control), communication (data needed for contract participation).
- **Extraction quota rules:** Set quotas based on resource stock and regeneration speed; quota overruns are slashable.
- **Cycle:** Adjust periods by resource type: water/power daily or weekly; fisheries/forestry by breeding/growth cycles, quarterly or yearly.
- **Regeneration incentives:** If maintenance/improvement is proven, reduce taxes or grant Token B rewards.
- **Effect:** Suppresses commons tragedies and "extract-first" behavior while ensuring sustainability.

### Intellectual Property and Contribution
#### 1. First Penguin Protocol (Procedural IP)
- **Spec:** When someone publishes a new procedure (rule template), its evaluation hash rises as it is used successfully for "proper work."
- **Royalty:** When others reference the template in contracts, a portion of fees automatically flows to the originator.
- **Effect:** Creating safer, more efficient procedures becomes a lasting asset (Token B).

#### 2. Lineage & Recursive Royalty (Lineage & Recursive Royalty)
- **Spec:** All templates are checked for similarity at registration; those above a threshold are tagged as forks.
- **Fork return:** Revenue from forked templates automatically returns a portion to the originator.
- **Import return:** Using others' templates as components routes usage fees upstream.
- **Accuracy boost:** Use real usage evidence and evaluation hash in addition to similarity scores.
- **Effect:** Makes theft and wheel-reinvention economically pointless while promoting accumulation.

#### 3. Contributor Shares (Contributor Shares)
- **Spec:** Multi-author templates lock a revenue share distribution at registration.
- **Change rule:** Any change requires signatures from all existing share holders.
- **Effect:** Prevents late, unfair claims and guarantees contribution-based payouts.

#### 4. Anti-Troll & Public Domain (Anti-Troll & Public Domain)
- **Royalty staking:** Require Token B deposits to enable royalties; mass low-value templates become costly.
- **Public domain challenge:** DAO can declare trivial steps public domain. Challenges require staking to deter abuse.
- **Royalty decay:** Pioneer rewards decay over time and eventually return to public domain. Decay speed is governance-adjustable.
- **Distribution cap:** Cap total royalties per task and per template to prevent excessive take by trivial precursors.
- **Effect:** Costs out valueless claims and protects genuine contributions.

### Governance and Audit
#### 1. Rule Debugging Rights and Responsibility (Redefining Integrity)
- **Spec:** Workers can file Issues against employer-provided procedures (rules).
- **Force-execute penalty:** If employers ignore reports and force execution, they assume 100% liability (deposit slashing).
- **Philosophy:** Integrity means transparency, not blind obedience. Refusing unfair orders is counted as honest behavior.

#### 2. Trade-off Governance (Trade-off Governance)
- **Spec:** When proposing changes to minimum living costs or distribution, the system auto-displays simulations of required funding (higher decay) or tolerated inflation (FX impact). Approval requires agreement on the cost.
- **Effect:** Structurally blocks unfunded populist decisions.

#### 3. Continuous Auditability (Continuous Auditability)
- **Spec:** Publish audit logs of core contract state and rule application results.
- **Examples:** Soil Treasury inflows/outflows, Token A distribution, decay rate changes, total advance balances.
- **Auto-checks:** Trigger alerts on deviations or inconsistencies. Thresholds such as +/-20% from the last 30-day average are governance-adjustable.
- **Effect:** Detects implementation drift early and reduces operational risk.

#### 4. Multi-layer Upgradability (Multi-layer Upgradability)
- **Core proxy:** Use proxy pattern for core components (Soil Treasury, distribution logic) to allow logic replacement while preserving data.
- **Standard:** Adopt UUPS for lower execution cost and flexible upgrade rules.
- **Modularization:** Separate surrounding logic (rule validation, resource pricing) into modules for targeted improvements.
- **Timelock:** Require a 30-day waiting period before upgrade execution to allow review and exit.
- **Authority:** Upgrade authority is limited to multisig or DAO decisions by high-integrity participants.
- **Top-tier definition:** Top 20% integrity scores among active users, with no dishonest records for 1+ years.
- **Threshold:** Critical actions require 5 of 9 signatures from selected signers.
- **Selection:** Signers are chosen randomly or by DAO election.
- **Transparency:** Selection and signatures are recorded in audit logs for public monitoring.
- **Dynamic adjustment:** These numeric thresholds can be updated via the governance in Spec 2.
- **Migration criteria:** Allow migration only when proxy fixes are impossible (storage collision, base chain disappearance).
- **Migration method:** Publish procedures and enforce timelock and exit rights (Spec 4).
- **Effect:** Balances fixability and transparency for long-term operation.

### Operations and Safety
#### 1. "Sunlight (ZKP)" for Privacy and Deterrence
- **Technical approach:** Use zero-knowledge proofs to record only mathematical evidence that agreed steps A, B, C were followed, without revealing task details.
- **Psychological effect:** Not constant surveillance, but a shield to prove honest behavior when questioned.

#### 2. Circuit Breaker (Circuit Breaker)
- **Spec:** If oracles fail or critical bugs are detected, progressively stop distribution, minting, or recovery functions.
- **Trigger conditions:** Audit log deviation alerts, oracle spikes, or confirmed critical vulnerability reports.
- **Safe-mode operations:** Allow receiving and viewing; restrict high-risk actions like minting and large transfers.
- **Release conditions:** Require governance approval and audited fixes.
- **Effect:** Prevents damage amplification and ensures recovery.

#### 3. Red Team & Bounty (Red Team & Bounty)
- **Spec:** Pay bounties and award integrity score points to vulnerability reporters.
- **Sanctions:** Slash and restrict participants who abuse vulnerabilities.
- **Effect:** Turn attackers into allies and incentivize early discovery.

#### 4. Exit & Migration (Exit & Migration)
- **Spec:** Participants can request asset transfers or evaluation termination at any time.
- **Settlement rules:** Settle outstanding advances, staking, and royalties before allowing transfer of remaining assets.
- **Effect:** Avoids lock-in and supports transparent, healthy participation.

#### 5. Data Minimization and Long-term Privacy (Data Minimization)
- **Spec:** Store minimal permanent data and substitute ZKP proofs wherever possible.
- **Retention policy:** Limit retention for personal data and define deletion/expiration procedures.
- **Effect:** Reduces long-term privacy risks.

#### 6. Treasury Security (Treasury Security)
- **Spec:** Require multisig and timelocks for Soil Treasury authority; prohibit single-key control.
- **Ops rules:** Log critical permission changes; require hardware keys and distributed custody.
- **Effect:** Prevents single points of failure and internal abuse.

#### 7. Oracle Fail-safe (Oracle Fail-safe)
- **Spec:** If CPI/TWAP oracles stop or show anomalies, freeze distribution/minting and auto-switch to last-known or conservative values.
- **Recovery:** Resume only when multiple sources agree and audit logs stabilize.
- **Effect:** Prevents supply runaway from oracle failure.

## Adoption Path
- **Phased rollout:** Start as regional currency, points, or evaluation system rather than replacing fiat immediately.
- **Small wins:** Build track record in OSS development, cooperatives, disaster relief, and local pilots where transparency and trust matter most.
- **UX first:** Assume World ID and gasless operations to minimize onboarding friction.
- **Real-world integration:** Coordinate physical resources and enforcement through legal oracles and existing institutions.
- **Incumbent conversion:** Encourage participation through contribution-based investment and risk reduction rather than exclusion.

## Tech Stack (Planned)
- **Smart Contracts:** Solidity
- **Development Framework:** Foundry or Hardhat
- **Frontend:** Next.js (React)
- **Blockchain:** Ethereum L2 (Optimism / Polygon)
- **Identity:** World ID SDK
