import { test, expect } from "@playwright/test";

test.describe("면제 관리", () => {
  test("면제 관리 페이지 로딩", async ({ page }) => {
    await page.goto("/exemption-manage");

    await expect(
      page.getByText("면제 관리").first()
    ).toBeVisible();
  });
});
