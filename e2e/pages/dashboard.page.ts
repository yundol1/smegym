import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly progressRing: Locator;
  readonly statsRow: Locator;
  readonly ctaButton: Locator;
  readonly noticeBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.progressRing = page.getByTestId("progress-ring");
    this.statsRow = page.getByTestId("stats-row");
    this.ctaButton = page.getByTestId("cta-button");
    this.noticeBanner = page.getByTestId("notice-banner");
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async getProgressText() {
    return this.progressRing.innerText();
  }
}
