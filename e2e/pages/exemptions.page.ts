import { type Page, type Locator } from "@playwright/test";

export class ExemptionsPage {
  readonly page: Page;
  readonly form: Locator;
  readonly datesInput: Locator;
  readonly reasonTextarea: Locator;
  readonly submitButton: Locator;
  readonly historyList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("exemption-form");
    this.datesInput = page.getByTestId("exemption-dates");
    this.reasonTextarea = page.getByTestId("exemption-reason");
    this.submitButton = page.getByTestId("exemption-submit");
    this.historyList = page.getByTestId("exemption-history");
  }

  async goto() {
    await this.page.goto("/exemptions");
  }

  async submitExemption(dates: string, reason: string) {
    await this.datesInput.fill(dates);
    await this.reasonTextarea.fill(reason);
    await this.submitButton.click();
  }
}
