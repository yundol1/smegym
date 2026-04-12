import { test, expect } from "@playwright/test";

test.describe("사진 검토", () => {
  test("사진 검토 페이지 로딩", async ({ page }) => {
    await page.goto("/photo-review");

    await expect(
      page.getByText("사진 검토").first()
    ).toBeVisible();
  });

  test("검토 대기 건수 또는 빈 상태 표시", async ({ page }) => {
    await page.goto("/photo-review");

    const hasItems = page.getByText(/\d+/).first();
    const emptyState = page.getByText("검토 대기 중인 인증이 없습니다");

    await expect(
      hasItems.or(emptyState)
    ).toBeVisible();
  });
});
