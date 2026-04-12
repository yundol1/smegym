import { test, expect } from "@playwright/test";

test.describe("갤러리", () => {
  test("갤러리 페이지 로딩", async ({ page }) => {
    await page.goto("/gallery");

    await expect(page.getByText("갤러리").first()).toBeVisible();
  });

  test("리액션 버튼 또는 빈 상태 표시", async ({ page }) => {
    await page.goto("/gallery");

    await expect(page.getByText("갤러리").first()).toBeVisible();

    // Either empty state or feed cards should be visible
    await expect(
      page.getByText("아직 공유된 인증이 없어요").or(page.locator("article").first())
    ).toBeVisible({ timeout: 10000 });
  });
});
