import { test, expect } from "@playwright/test";

test.describe("갤러리", () => {
  test("갤러리 페이지 로딩", async ({ page }) => {
    await page.goto("/gallery");

    // Expect the page heading to be visible
    await expect(page.getByRole("heading", { name: "갤러리" })).toBeVisible();
  });

  test("리액션 버튼 표시", async ({ page }) => {
    await page.goto("/gallery");

    // Wait for loading to finish
    await expect(page.getByRole("heading", { name: "갤러리" })).toBeVisible();

    // Check if gallery cards exist (articles) or empty state is shown
    const emptyMessage = page.getByText("아직 공유된 인증이 없어요");
    const articles = page.locator("article");

    const isEmpty = await emptyMessage.isVisible().catch(() => false);

    if (isEmpty) {
      await expect(emptyMessage).toBeVisible();
    } else {
      // If there are feed cards, check for reaction pill buttons
      const articleCount = await articles.count();
      if (articleCount > 0) {
        const firstArticle = articles.first();
        // Reaction buttons contain emoji characters
        await expect(firstArticle.getByRole("button").first()).toBeVisible();
      }
    }
  });
});
