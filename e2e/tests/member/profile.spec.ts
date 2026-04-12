import { test, expect } from "@playwright/test";

test.describe("프로필 설정", () => {
  test("프로필 수정 페이지 로딩", async ({ page }) => {
    await page.goto("/settings/profile");

    await expect(
      page.getByText("프로필").first()
    ).toBeVisible();
  });

  test("비밀번호 변경 페이지 로딩", async ({ page }) => {
    await page.goto("/settings/password");

    await expect(
      page.getByText("비밀번호").first()
    ).toBeVisible();
  });
});
