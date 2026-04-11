import { test, expect } from "@playwright/test";
import { DashboardPage } from "../../pages/dashboard.page";

test.describe("대시보드", () => {
  test("대시보드 로딩 및 렌더링", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.progressRing).toBeVisible();
    await expect(dashboard.statsRow).toBeVisible();
    await expect(dashboard.ctaButton).toBeVisible();
  });

  test("인증하기 버튼 클릭 시 운동 페이지로 이동", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.ctaButton.click();

    await expect(page).toHaveURL(/\/workout/);
  });

  test("네비게이션 링크 동작", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Navigate to workout via sidebar/nav
    await page.getByRole("link", { name: "운동인증" }).click();
    await expect(page).toHaveURL(/\/workout/);

    // Navigate to exemptions
    await page.getByRole("link", { name: "면제신청" }).click();
    await expect(page).toHaveURL(/\/exemptions/);

    // Navigate back to dashboard
    await page.getByRole("link", { name: "대시보드" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
