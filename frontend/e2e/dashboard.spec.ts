import { expect, test } from "@playwright/test";

test.describe("FairSoil dashboard", () => {
  test("participant flow shows the default onboarding path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Connect your wallet, verify it, and begin using FairSoil." })
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Use FairSoil" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Start using FairSoil" })).toBeVisible();

    await expect(page.locator("strong").filter({ hasText: "Verify your wallet" })).toBeVisible();
    await expect(page.locator("strong").filter({ hasText: "Collect your bonus" })).toBeVisible();
    await expect(page.locator("strong").filter({ hasText: "Create work agreements" })).toBeVisible();

    const agreementCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Step 3: Create a work agreement" }),
    });
    await expect(agreementCard.getByRole("heading", { name: "Step 3: Create a work agreement" })).toBeVisible();
    await expect(agreementCard.getByRole("textbox", { name: "Who will do the work?" })).toBeVisible();
    await expect(agreementCard.getByRole("combobox", { name: "Reward type" })).toBeVisible();
    await expect(agreementCard.getByRole("button", { name: "Open optional details" })).toBeDisabled();
    await expect(agreementCard.getByText("Enter the worker wallet first.")).toBeVisible();
    await expect(agreementCard.getByText("Visible quote breakdown")).toBeVisible();
  });

  test("identity card shows route states, hints, and next-step guidance", async ({ page }) => {
    await page.goto("/");

    const identityCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Step 1: Verify this wallet" }),
    });

    await expect(identityCard.getByText(/^Verification status:/)).toBeVisible();
    await expect(identityCard.getByText(/^Active route:/)).toBeVisible();
    await expect(identityCard.getByText(/^World ID mode:/)).toBeVisible();
    await expect(identityCard.getByText(/^ZK-NFC mode:/)).toBeVisible();
    await expect(identityCard.getByText(/^Operator fallback:/)).toBeVisible();

    await expect(identityCard.getByText("Suggested next step")).toBeVisible();
    await expect(
      identityCard.getByText("Connect a wallet first to see which verification routes are usable.")
    ).toBeVisible();
    await expect(identityCard.getByText("Retry or fallback")).toHaveCount(0);

    await expect(identityCard.getByRole("button", { name: /Verify \(mock\)|Verify with World ID/ })).toBeVisible();
    await expect(identityCard.getByRole("button", { name: "Operator verify (mock)" })).toBeVisible();

    await expect(identityCard.getByText("Connect a wallet to start World ID verification.")).toBeVisible();
    const zknfcButton = identityCard.getByRole("button", { name: /Verify \(mock\)|Verify with ZK-NFC/ });
    if (await zknfcButton.count()) {
      await expect(zknfcButton).toBeVisible();
      await expect(identityCard.getByText("Connect a wallet to start ZK-NFC verification.")).toBeVisible();
    }
    await expect(identityCard.getByText("Connect a wallet first.").first()).toBeVisible();
  });

  test("operator flow exposes review tools and owner-only guidance", async ({ page }) => {
    await page.goto("/");

    const operatorTab = page.getByRole("tab", { name: "Run FairSoil" });
    await operatorTab.click({ force: true });

    await expect(page.getByText("Operator view is for the temporary operator wallet, manual reviewers, and the dispute arbiter.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "System setup and review tools" })).toBeVisible();
    await expect(
      page.getByText("Temporary operator: changes system settings and treasury rules")
    ).toBeVisible();
  });

  test("work agreements section shows queue filters and empty-state guidance", async ({ page }) => {
    await page.goto("/");

    const workAgreements = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Work agreements" }),
    });

    await expect(workAgreements.getByRole("button", { name: "All" })).toBeVisible();
    await expect(workAgreements.getByRole("button", { name: /Needs my action/ })).toBeVisible();
    await expect(workAgreements.getByRole("button", { name: /Creator/ })).toBeVisible();
    await expect(workAgreements.getByRole("button", { name: /Worker/ })).toBeVisible();
    await expect(workAgreements.getByRole("button", { name: /Resolver/ })).toBeVisible();
    await expect(workAgreements.getByRole("button", { name: /Finalizer/ })).toBeVisible();
    await expect(
      workAgreements.getByText(
        "Filter by operational role to focus on the next manual step instead of scanning every agreement."
      )
    ).toBeVisible();
    await expect(
      workAgreements.getByText("No agreements yet. Create one above to start the work flow.")
    ).toBeVisible();
  });
});
