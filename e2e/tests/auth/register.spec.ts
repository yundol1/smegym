import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const EXISTING_NICKNAME = process.env.E2E_MEMBER_NICKNAME || "e2e-member";

test.describe("회원가입", () => {
  test("회원가입 페이지 렌더링", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByTestId("register-nickname")).toBeVisible();
    await expect(page.getByTestId("register-password")).toBeVisible();
    await expect(page.getByTestId("register-confirm-password")).toBeVisible();
    await expect(page.getByTestId("register-button")).toBeVisible();
  });

  test("비밀번호 불일치 시 에러", async ({ page }) => {
    await page.goto("/register");

    await page.getByTestId("register-nickname").fill("test-mismatch-user");
    await page.getByTestId("register-password").fill("password123!");
    await page.getByTestId("register-confirm-password").fill("different456!");
    // Fill required security answer field
    await page.locator("#securityAnswer").fill("test answer");
    await page.getByTestId("register-button").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(
      "비밀번호가 일치하지 않습니다"
    );
  });

  test("닉네임 중복 시 에러", async ({ page }) => {
    await page.goto("/register");

    await page.getByTestId("register-nickname").fill(EXISTING_NICKNAME);
    await page.getByTestId("register-password").fill("test1234!");
    await page.getByTestId("register-confirm-password").fill("test1234!");
    await page.locator("#securityAnswer").fill("test answer");
    await page.getByTestId("register-button").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(
      "이미 사용 중인 닉네임"
    );
  });
});
