import { test, expect } from "@playwright/test";

test.describe("공지사항", () => {
  test("공지사항 페이지 로딩", async ({ page }) => {
    await page.goto("/notices");

    await expect(page.getByRole("heading", { name: "공지사항" })).toBeVisible();
  });

  test("빈 목록 또는 공지 목록 표시", async ({ page }) => {
    await page.goto("/notices");

    await expect(page.getByRole("heading", { name: "공지사항" })).toBeVisible();

    // Either empty state or notice cards should be visible
    await expect(
      page.getByText("등록된 공지사항이 없습니다.").or(page.locator("[data-notice-card]").first())
    ).toBeVisible();
  });
});
