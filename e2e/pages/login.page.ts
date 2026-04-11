import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly nicknameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly autoLoginCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nicknameInput = page.getByTestId("nickname-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
    this.errorMessage = page.getByTestId("error-message");
    this.autoLoginCheckbox = page.getByTestId("auto-login-checkbox");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(nickname: string, password: string) {
    await this.nicknameInput.fill(nickname);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
