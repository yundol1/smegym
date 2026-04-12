import { test, expect } from "@playwright/test";

test.describe("멤버 관리", () => {
  test("멤버 관리 페이지 로딩", async ({ page }) => {
    await page.goto("/member-manage");

    await expect(
      page.getByText("멤버 관리").first()
    ).toBeVisible();
  });

  test("탭 전환 동작", async ({ page }) => {
    await page.goto("/member-manage");

    const pendingTab = page.getByRole("button", { name: /가입 대기/ }).first();
    const currentTab = page.getByRole("button", { name: /현재 멤버/ }).first();
    const withdrawnTab = page.getByRole("button", { name: /탈퇴 멤버/ }).first();

    await expect(pendingTab).toBeVisible();
    await expect(currentTab).toBeVisible();
    await expect(withdrawnTab).toBeVisible();

    await pendingTab.click();
  });
});
