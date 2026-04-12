import { test, expect } from "@playwright/test";

test.describe("반기 결산", () => {
  test("반기 결산 페이지 로딩", async ({ page }) => {
    await page.goto("/report");

    await expect(
      page.getByText("반기 결산").first()
    ).toBeVisible();
  });

  test("통계 카드 표시", async ({ page }) => {
    await page.goto("/report");

    await expect(
      page.getByText(/총 운동|\d+/).first()
    ).toBeVisible();
  });
});
