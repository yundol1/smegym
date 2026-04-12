import { test, expect } from "@playwright/test";

test.describe("챌린지", () => {
  test("챌린지 페이지 로딩", async ({ page }) => {
    await page.goto("/challenges");

    // Expect the page heading to be visible
    await expect(page.getByRole("heading", { name: "챌린지" })).toBeVisible();
  });

  test("필터 탭 동작", async ({ page }) => {
    await page.goto("/challenges");

    // Wait for the page to load
    await expect(page.getByRole("heading", { name: "챌린지" })).toBeVisible();

    // Expect all filter pills to be visible
    const filters = ["전체", "진행 중", "예정", "종료"];
    for (const filter of filters) {
      await expect(
        page.getByRole("button", { name: filter, exact: true })
      ).toBeVisible();
    }

    // Click "종료" filter and verify it becomes active (background changes to primary green)
    const endedButton = page.getByRole("button", { name: "종료", exact: true });
    await endedButton.click();

    // After clicking, the button should have the active style (green background)
    await expect(endedButton).toHaveCSS("background-color", "rgb(0, 230, 118)");
  });
});
