import { chromium, type FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const authDir = path.join(__dirname, ".auth");

async function loginAndSave(
  baseURL: string,
  nickname: string,
  password: string,
  filename: string
) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.fill('[data-testid="nickname-input"]', nickname);
  await page.fill('[data-testid="password-input"]', password);
  // 자동 로그인 체크 (테스트 세션 유지를 위해)
  await page.check('[data-testid="auto-login-checkbox"]');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await context.storageState({ path: path.join(authDir, filename) });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Login as member
  await loginAndSave(
    baseURL,
    process.env.E2E_MEMBER_NICKNAME || "e2e-member",
    process.env.E2E_MEMBER_PASSWORD || "test1234!",
    "member.json"
  );

  // Login as admin
  await loginAndSave(
    baseURL,
    process.env.E2E_ADMIN_NICKNAME || "e2e-admin",
    process.env.E2E_ADMIN_PASSWORD || "test1234!",
    "admin.json"
  );
}
