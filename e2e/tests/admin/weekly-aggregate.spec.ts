import { test, expect } from "@playwright/test";

test.describe("주간 집계", () => {
  test("주간 집계 페이지 로딩", async ({ page }) => {
    await page.goto("/weekly-aggregate");

    await expect(
      page.getByText("주간 집계").first()
    ).toBeVisible();
  });

  test("집계 버튼 표시", async ({ page }) => {
    await page.goto("/weekly-aggregate");

    await expect(
      page.getByRole("button", { name: /집계/ }).first()
    ).toBeVisible();
  });
});
