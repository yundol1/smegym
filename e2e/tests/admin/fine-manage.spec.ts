import { test, expect } from "@playwright/test";

test.describe("벌금 관리", () => {
  test("벌금 관리 페이지 로딩", async ({ page }) => {
    await page.goto("/fine-manage");

    await expect(
      page.getByText("벌금 관리").first()
    ).toBeVisible();
  });
});
