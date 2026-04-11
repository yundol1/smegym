import { type Page, type Locator } from "@playwright/test";

export class WorkoutPage {
  readonly page: Page;
  readonly dayCards: Locator;
  readonly uploadModal: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly galleryToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dayCards = page.locator("[data-testid^='day-card-']");
    this.uploadModal = page.getByTestId("upload-modal");
    this.fileInput = page.getByTestId("file-input");
    this.submitButton = page.getByTestId("upload-submit");
    this.galleryToggle = page.getByTestId("gallery-toggle");
  }

  async goto() {
    await this.page.goto("/workout");
  }

  async openDayCard(dayNum: number) {
    await this.page.getByTestId(`day-card-${dayNum}`).click();
  }

  async uploadPhoto(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async submitUpload() {
    await this.submitButton.click();
  }
}
