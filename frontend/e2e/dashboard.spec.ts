import { expect, test } from "@playwright/test";

test.describe("FairSoil dashboard", () => {
  test("participant flow shows the default onboarding path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Connect your wallet, verify it, and begin using FairSoil." })
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Use FairSoil" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Start using FairSoil" })).toBeVisible();

    await expect(page.getByText("Verify your wallet", { exact: true })).toBeVisible();
    await expect(page.getByText("Collect your bonus", { exact: true })).toBeVisible();
    await expect(page.getByText("Create work agreements", { exact: true })).toBeVisible();

    const agreementCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Step 3: Create a work agreement" }),
    });
    const workerField = agreementCard.getByRole("textbox", { name: "Who will do the work?" });
    const optionalDetailsButton = agreementCard.getByRole("button", { name: "Open optional details" });

    await expect(optionalDetailsButton).toBeDisabled();
    await expect(agreementCard.getByText("Enter the worker wallet first.")).toBeVisible();

    await workerField.fill("0x000000000000000000000000000000000000bEEF");
    await expect(optionalDetailsButton).toBeEnabled();
    await optionalDetailsButton.click();

    await expect(agreementCard.getByRole("button", { name: "Back to main details" })).toBeVisible();
    await expect(agreementCard.getByRole("button", { name: "Create Agreement (approve + lock)" })).toBeVisible();
    await expect(
      agreementCard.getByText("Your wallet first allows token use, then confirms the reward lock.")
    ).toBeVisible();
    await expect(agreementCard.getByText("Connect a wallet first.").first()).toBeVisible();
  });

  test("operator flow exposes review tools and owner-only guidance", async ({ page }) => {
    await page.goto("/");

    const operatorTab = page.getByRole("tab", { name: "Run FairSoil" });
    await operatorTab.click();

    await expect(operatorTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "System setup and review tools" })).toBeVisible();
    await expect(
      page.getByText("Temporary operator: changes system settings and treasury rules")
    ).toBeVisible();

    const appiCard = page.locator("details").filter({
      has: page.getByRole("heading", { name: "Daily bonus index controls" }),
    });
    await appiCard.locator("summary").click();
    await expect(appiCard.getByRole("button", { name: "Set oracle wallet" })).toBeVisible();
    await expect(
      appiCard.getByText("In this MVP, the temporary operator wallet sets the rules")
    ).toBeVisible();
    await expect(appiCard.getByText("Connect a wallet first.")).toBeVisible();

    const rewardCard = page.locator("details").filter({
      has: page.getByRole("heading", { name: "Manual reward report" }),
    });
    await rewardCard.locator("summary").click();
    await rewardCard.getByRole("textbox", { name: "Worker wallet" }).fill(
      "0x000000000000000000000000000000000000bEEF"
    );

    await expect(rewardCard.getByRole("button", { name: "Add verified reward" })).toBeDisabled();
    await expect(
      rewardCard.getByText("In the current MVP, this needs the temporary operator wallet")
    ).toBeVisible();
    await expect(rewardCard.getByText("Connect a wallet first.")).toBeVisible();
  });
});
