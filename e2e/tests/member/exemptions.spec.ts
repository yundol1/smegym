import { test, expect } from "@playwright/test";
import { ExemptionsPage } from "../../pages/exemptions.page";

test.describe("면제 신청", () => {
  test("면제 신청 페이지 로딩", async ({ page }) => {
    const exemptions = new ExemptionsPage(page);
    await exemptions.goto();

    await expect(exemptions.form).toBeVisible();
    await expect(exemptions.historyList).toBeVisible();
  });

  test("빈 폼 제출 시 validation", async ({ page }) => {
    const exemptions = new ExemptionsPage(page);
    await exemptions.goto();

    // Submit button should be disabled when the form is empty
    await expect(exemptions.submitButton).toBeDisabled();

    // Fill only dates but leave reason empty
    await exemptions.datesInput.fill("3/25(월)");
    await expect(exemptions.submitButton).toBeDisabled();

    // Clear dates, fill only reason
    await exemptions.datesInput.clear();
    await exemptions.reasonTextarea.fill("테스트 사유");
    await expect(exemptions.submitButton).toBeDisabled();
  });
});
