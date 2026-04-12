import { test, expect } from "@playwright/test";

test.describe("랭킹", () => {
  test("랭킹 페이지 로딩", async ({ page }) => {
    await page.goto("/ranking");

    // Expect the ranking heading to be visible
    await expect(page.getByRole("heading", { name: "랭킹" })).toBeVisible();
  });

  test("내 기록 섹션 표시", async ({ page }) => {
    await page.goto("/ranking");

    // Wait for the page to load
    await expect(page.getByRole("heading", { name: "랭킹" })).toBeVisible();

    // Expect "내 기록" section to be visible
    await expect(page.getByText("내 기록")).toBeVisible();
  });
});
