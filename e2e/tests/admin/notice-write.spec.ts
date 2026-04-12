import { test, expect } from "@playwright/test";

test.describe("공지 작성", () => {
  test("공지 작성 페이지 로딩", async ({ page }) => {
    await page.goto("/notice-write");

    await expect(
      page.getByText("공지").first()
    ).toBeVisible();
  });
});
