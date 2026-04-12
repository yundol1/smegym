import { test, expect } from "@playwright/test";

test.describe("설정", () => {
  test("설정 페이지 로딩", async ({ page }) => {
    await page.goto("/settings");

    // Expect the page heading to be visible
    await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();

    // Expect the profile section with a nickname (either the user's nickname or fallback "사용자")
    const profileSection = page.locator("section").first();
    await expect(profileSection).toBeVisible();
  });

  test("로그아웃 버튼 표시", async ({ page }) => {
    await page.goto("/settings");

    // Wait for the page to load
    await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();

    // Expect logout button to be visible
    await expect(
      page.getByRole("button", { name: "로그아웃" })
    ).toBeVisible();
  });
});
