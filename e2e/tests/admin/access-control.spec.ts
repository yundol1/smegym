import { test, expect } from "@playwright/test";

// Override storageState to use member (not admin) session
test.use({ storageState: "e2e/.auth/member.json" });

test.describe("관리자 접근 제어", () => {
  test("일반 회원이 관리자 페이지 접근 차단", async ({ page }) => {
    await page.goto("/photo-review");

    // The admin layout shows an access denied message for non-admin users
    await expect(page.getByText("접근 권한이 없습니다")).toBeVisible();
  });
});
