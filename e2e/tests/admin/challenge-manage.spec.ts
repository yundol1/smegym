import { test, expect } from "@playwright/test";

test.describe("챌린지 관리", () => {
  test("챌린지 관리 페이지 로딩", async ({ page }) => {
    await page.goto("/challenge-manage");

    await expect(
      page.getByText("챌린지").first()
    ).toBeVisible();
  });
});
