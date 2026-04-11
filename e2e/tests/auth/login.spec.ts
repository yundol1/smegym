import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import { LoginPage } from "../../pages/login.page";

dotenv.config({ path: ".env.test" });

const MEMBER_NICKNAME = process.env.E2E_MEMBER_NICKNAME || "e2e-member";
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD || "test1234!";
const PENDING_NICKNAME = process.env.E2E_PENDING_NICKNAME || "e2e-pending";
const PENDING_PASSWORD = process.env.E2E_PENDING_PASSWORD || "test1234!";
const WITHDRAWN_NICKNAME = process.env.E2E_WITHDRAWN_NICKNAME || "e2e-withdrawn";
const WITHDRAWN_PASSWORD = process.env.E2E_WITHDRAWN_PASSWORD || "test1234!";

test.describe("로그인", () => {
  test("정상 로그인 후 대시보드로 이동", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(MEMBER_NICKNAME, MEMBER_PASSWORD);

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("잘못된 비밀번호 시 에러 표시", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(MEMBER_NICKNAME, "wrongpassword123!");

    await expect(loginPage.errorMessage).toBeVisible();
  });

  test("pending 상태 계정 로그인 차단", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(PENDING_NICKNAME, PENDING_PASSWORD);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText("승인 대기");
  });

  test("withdrawn 상태 계정 로그인 차단", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(WITHDRAWN_NICKNAME, WITHDRAWN_PASSWORD);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText("탈퇴");
  });

  test("비인증 상태로 대시보드 접근 시 리디렉트", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
  });
});
