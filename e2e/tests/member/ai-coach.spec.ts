import { test, expect } from "@playwright/test";

test.describe("AI 코치", () => {
  test("AI 코치 페이지 로딩", async ({ page }) => {
    await page.goto("/ai-coach");

    await expect(
      page.getByText(/운동 코치|SME|AI코치/).first()
    ).toBeVisible();
  });

  test("메시지 입력 가능", async ({ page }) => {
    await page.goto("/ai-coach");

    await expect(page.getByText(/운동 코치|SME|AI코치/).first()).toBeVisible();

    // Verify input field exists and can accept text
    const input = page.getByRole("textbox").first();
    await expect(input).toBeVisible();
    await input.fill("오늘 운동 추천해줘");
    await expect(input).toHaveValue("오늘 운동 추천해줘");
  });
});
