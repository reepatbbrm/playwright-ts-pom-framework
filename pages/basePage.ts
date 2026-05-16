import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  log(message: string): void {
    const time = new Date().toTimeString().split(' ')[0];
    process.stdout.write(`[${time}] ${message}\n`);
  }

  async verifyExecuteApi(moduleId: string, timeout: number = 10000): Promise<void> {
    const response = await this.page.waitForResponse(
      res => res.url().includes(`/modules/${moduleId}/execute`),
      { timeout }
    );
    const status = response.status();
    this.log(`PASS — Execute API verified: module "${moduleId}" → status ${status}`);
    expect(status, `Execute API returned wrong status for module "${moduleId}" — expected 200 but got ${status}`).toBe(200);
  }

  // Recursively searches the JSON tree for an exact key-value match.
  // Returns the dotted path where it was found, or null if not present.
  private searchInJson(obj: unknown, key: string, value: unknown, path: string = ''): string | null {
    if (obj === null || typeof obj !== 'object') return null;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const found = this.searchInJson(obj[i], key, value, `${path}[${i}]`);
        if (found) return found;
      }
      return null;
    }

    const record = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(record)) {
      const currentPath = path ? `${path}.${k}` : k;
      if (k === key) {
        // Exact deep match
        if (JSON.stringify(v) === JSON.stringify(value)) {
          return currentPath;
        }
        // Primitive expected, array actual → check membership
        const isPrimitive = ['string', 'number', 'boolean'].includes(typeof value);
        if (isPrimitive && Array.isArray(v) && v.some(item => JSON.stringify(item) === JSON.stringify(value))) {
          return `${currentPath} (contains)`;
        }
      }
      const nested = this.searchInJson(v, key, value, currentPath);
      if (nested) return nested;
    }

    return null;
  }

  async verifyExecuteApiResponseData(
    expectedData: Record<string, unknown>,
    moduleId?: string,
    timeout: number = 10000
  ): Promise<void> {
    try {
      const urlFilter = moduleId
        ? (res: { url: () => string }) => res.url().includes(`/modules/${moduleId}/execute`)
        : (res: { url: () => string }) => res.url().includes('/execute');

      const response = await this.page.waitForResponse(urlFilter, { timeout });
      const url = response.url();
      const status = response.status();

      this.log(`Execute API intercepted: "${url}" → status ${status}`);

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error(`Execute API response is not valid JSON for "${url}"`);
      }

      this.log(`Searching response body for expected fields:`);
      const failures: string[] = [];

      for (const [key, expected] of Object.entries(expectedData)) {
        const foundPath = this.searchInJson(body, key, expected);
        if (foundPath) {
          this.log(`  PASS → "${key}" = ${JSON.stringify(expected)} found at "${foundPath}"`);
        } else {
          this.log(`  FAIL → "${key}" = ${JSON.stringify(expected)} not found anywhere in response`);
          failures.push(`"${key}" with value ${JSON.stringify(expected)}`);
        }
      }

      if (failures.length > 0) {
        this.log(`Actual response body received:\n${JSON.stringify(body, null, 2)}`);
        throw new Error(`Response body verification failed — could not find: ${failures.join(', ')}`);
      }

      this.log(`All response fields verified successfully.`);
    } catch (error: unknown) {
      this.log(`Failed to verify execute API response — ${error}`);
      throw error;
    }
  }

  //  Click a button
  async clickButton(locator: Locator | string): Promise<void> {
    if (typeof locator === 'string') {
      await this.page.getByRole('button', { name: locator }).click();
    } else {
      await locator.click();
    }
  }

  //  Select a value from dropdown
  async selectComboBox(locator: Locator, value: string): Promise<void> {
    await locator.selectOption(value);
  }

  // Verify single dropdown value
  async verifyDropdownValue(locator: Locator, expectedValue: string): Promise<void> {
    const selected = await locator.inputValue();
    expect(selected).toBe(expectedValue);
  }

  //  Verify multiple values exist in dropdown
  async verifyDropdownValues(locator: Locator, expectedValues: string[]): Promise<void> {
    const options = await locator.locator('option').allTextContents();
    for (const value of expectedValues) {
      expect(options).toContain(value);
    }
  }

  //  Verify text value is visible
  async verifyTextValue(expectedText: string): Promise<void> {
    await expect(this.page.getByText(expectedText)).toBeVisible();
  }

  // Verify fields inside a modal
  async verifyModalFields(modalLocator: Locator, fieldLabels: string[]): Promise<void> {
    for (const label of fieldLabels) {
      await expect(modalLocator.getByText(label)).toBeVisible();
    }
  }

  // Verify all column names in a grid/table
  async verifyGridColumnNames(gridLocator: Locator, expectedColumns: string[]): Promise<void> {
    const headers = await gridLocator.locator('th').allTextContents();
    expect(headers).toEqual(expectedColumns);
  }

  //  Navigate to a URL
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }



  //New Generic locators that can be used throughout the framework
  async waitForPageReloadToFinish() {
		// Wait for 'load' state to ensure the page fully reloaded
		await this.page.waitForLoadState('load');
		// Optionally, also wait for 'networkidle' if the page makes API calls after reload
		await this.page.waitForLoadState('networkidle');
	}

	protected async verifyElementContainsText(
		locator: Locator,
		expectedText: string,
		timeout: number = 10000
	): Promise<void> {
		try {
			await expect.soft(locator).toBeVisible({ timeout });

			const tagName = await locator.evaluate(el => el.tagName.toLowerCase());

			if (tagName === "input" || tagName === "textarea") {
				this.log(`started to verify input value for "${locator}" with "${expectedText}"`);
				await expect(locator).toHaveValue(expectedText, { timeout });
				this.log(`Verified that input "${locator}" has value: "${expectedText}"`);
			} else {
				this.log(`started to verify text content for "${locator}" with "${expectedText}"`);
				await expect(locator).toHaveText(expectedText, { timeout });
				this.log(`Verified that element "${locator}" has text: "${expectedText}"`);
			}
		} catch (error: unknown) {
			this.log(`Failed to verify text/value for element: ${locator}`);
			throw error;
		}
	}

	async verifySubmissionIdFromUrl(url: string, expectedLength: number) {
		this.log(`Verifying URL: ${url}`);
		// Use URL API to parse query params
		const parsed = new URL(url.replace('#', '')); // remove hash for parsing
		const submissionId = parsed.searchParams.get("id") || "";

		expect(submissionId, "Submission ID should not be empty").not.toBe("");
		expect(submissionId.length, `Submission ID should have ${expectedLength} characters`)
			.toBe(expectedLength);

		this.log(`Submission ID '${submissionId}' has length ${expectedLength}`);
	}

	async pause(timeout: number = 10000) {
		await this.page.waitForTimeout(timeout)
		this.log(`Waiting for "${timeout}ms"`)
	}

	async pressEnter() {
		await this.page.keyboard.press('Enter');
		this.log('Pressed Enter key.');
	}
	async pressTab() {
		await this.page.keyboard.press('Tab');
		this.log('Pressed Tab key.');
	}

	async navigateTo(urlAddress: string) {
		await this.page.goto(urlAddress)
	}

	async reloadPage() {
		await this.page.reload()
	}


	protected async verifyElementContainsTextFromMultipleElement(
		locator: Locator,
		expectedText: string,
		timeout: number = 15000
	): Promise<void> {
		try {
			await expect.soft(locator.first()).toBeVisible({ timeout });

			const count = await locator.count();
			if (count === 0) {
				throw new Error(`No elements found for locator: ${locator}`);
			}

			let found = false;
			for (let i = 0; i < count; i++) {
				const textValue = (await locator.nth(i).textContent())?.trim() ?? "";
				if (textValue === expectedText) {
					found = true;
					this.log(`Verified that element #${i} has the exact text: "${expectedText}"`);
					break;
				}
			}

			if (!found) {
				throw new Error(`None of the ${count} elements contained the exact text "${expectedText}".`);
			}

		} catch (error: unknown) {
			this.log(`Failed to verify text for element(s) matching locator: ${locator}`);
			throw error;
		}
	}

	public async generateRandomEmail(length: number, domain: string = "gmail.com"): Promise<string> {
		const chars: string = "abcdefghijklmnopqrstuvwxyz";
		let randomPart: string = "";

		for (let i = 0; i < length; i++) {
			const randomIndex: number = Math.floor(Math.random() * chars.length);
			randomPart += chars[randomIndex];
		}

		// simulate async if needed (e.g., if you later fetch data from server)
		return `${randomPart}@${domain}`;
	}

	public async generateRandomText(length: number, domain: string = "gmail.com"): Promise<string> {
		const chars: string = "abcdefghijklmnopqrstuvwxyz";
		let randomPart: string = "";

		for (let i = 0; i < length; i++) {
			const randomIndex: number = Math.floor(Math.random() * chars.length);
			randomPart += chars[randomIndex];
		}

		// simulate async if needed (e.g., if you later fetch data from server)
		return randomPart;
	}


	protected async verifyElementIsVisible2(
		locator: Locator,
		timeout: number = 20000
	): Promise<void> {
		try {
			await expect.soft(locator).toBeVisible({ timeout });

			this.log(`Verified that element "${locator}" is visible within ${timeout}ms`);
		} catch (error: unknown) {
			this.log(`Failed to verify the visibility for element: ${locator} within ${timeout}ms`);
			throw error;
		}
	}

	protected async verifyElementIsNotVisible(
		locator: Locator,
		timeout: number = 20000
	): Promise<void> {
		try {
			await expect.soft(locator).not.toBeVisible({ timeout });

			this.log(`Verified that element "${locator}" is NOT visible within ${timeout}ms`);
		} catch (error: unknown) {
			this.log(`Element "${locator}" is still visible after ${timeout}ms`);
			throw error;
		}
	}

	async pressDownArrow() {
		await this.page.keyboard.press("ArrowDown");
		this.log("Pressed Down Arrow key.");
	}

	async clickAndSelectDropdownValue(dropdown: Locator, value: string): Promise<void> {
		try {
			await dropdown.waitFor({ state: "visible" });

			// Click to open the dropdown
			await dropdown.click();

			// Select the option from the list
			const option = this.page.getByRole('option', { name: value });
			await option.click();

			this.log(`Selected "${value}" from dropdown.`);
		} catch (error) {
			this.log(`Failed to select "${value}" from dropdown — ${error}`);
			throw error;
		}
	}

	protected async verifyRadioButtonIsChecked(
		radioButton: Locator,
		expected: boolean = true
	): Promise<void> {
		try {
			await radioButton.waitFor({ state: "attached" }); // ensure it exists in DOM
			const isChecked = await radioButton.isChecked();

			if (isChecked !== expected) {
				throw new Error(
					`Radio button state mismatch: expected checked=${expected}, but got checked=${isChecked}`
				);
			}

			this.log(`Verified radio button is ${expected ? "checked" : "not checked"}.`);
		} catch (error) {
			this.log(`Failed to verify radio button state — ${error}`);
			throw error;
		}
	}


	async verifyDropdownHasOptions(dropdown: Locator): Promise<void> {
		// Count how many 'option' elements are inside the select
		const count = await dropdown.locator("option").count();

		// Most dropdowns have 1 placeholder (e.g., "Select an option"),
		// so we usually check if count is > 1
		if (count <= 1) {
			throw new Error("Dropdown appears to be empty or only contains a placeholder.");
		}
		this.log(`Verified dropdown has ${count} options.`);
	}

	async selectDropdownValue(dropdown: Locator, value: string): Promise<void> {
		try {
			await dropdown.waitFor({ state: "visible" });
			await dropdown.selectOption({ label: value });
			this.log(`Selected "${value}" from dropdown.`);
		} catch (error) {
			this.log(`Failed to select "${value}" from dropdown — ${error}`);
			throw error;
		}
	}

	async verifyDropdownLabelSelected(dropdown: Locator, expectedLabel: string): Promise<void> {
		const selectedLabel = (await dropdown.locator("option:checked").textContent())?.trim();
		if (selectedLabel !== expectedLabel) {
			throw new Error(
				`Dropdown label mismatch. Expected "${expectedLabel}", but got "${selectedLabel}".`
			);
		}
		this.log(`Verified dropdown label "${expectedLabel}" is selected.`);
	}

	async verifyDropdownLabelSelectedForNonNativeDropdown(
		dropdown: Locator,
		expectedLabel: string
	): Promise<void> {
		const selectedLabel = (await dropdown.textContent())?.trim();
		if (selectedLabel !== expectedLabel) {
			throw new Error(
				`Dropdown label mismatch. Expected "${expectedLabel}", but got "${selectedLabel}".`
			);
		}
		this.log(`Verified custom dropdown label "${expectedLabel}" is selected.`);
	}


	async getTextFromElement(element: Locator): Promise<string> {
		try {
			await element.waitFor({ state: "visible" });
			const text = (await element.textContent())?.trim() ?? "";
			this.log(`Fetched text from element: "${text}"`);
			return text;
		} catch (error) {
			this.log(`Failed to get text from element — ${error}`);
			throw error;
		}
	}




	protected async verifyElementIsDisabled2(
		locator: Locator,
		timeout: number = 10000
	): Promise<void> {
		try {
			await expect.soft(locator).toBeDisabled({ timeout });
			this.log(`Verified that element "${locator}" is disabled within "${timeout}" ms`);
		} catch (error: unknown) {
			this.log(`Failed to verify that element "${locator}" is disabled — ${error}`);
			throw error;
		}
	}

	protected async verifyElementIsEnabled2(
		locator: Locator,
		timeout: number = 10000
	): Promise<void> {
		try {
			await expect.soft(locator).toBeEnabled({ timeout });
			this.log(`Verified that element "${locator}" is enabled within "${timeout}" ms`);
		} catch (error: unknown) {
			this.log(`Failed to verify that element "${locator}" is enabled — ${error}`);
			throw error;
		}
	}

	async waitForVisibilityAndClick(
		locator: Locator,
		timeout: number = 20000
	): Promise<void> {
		try {
			await expect.soft(locator).toBeVisible({ timeout });
			await expect.soft(locator).toBeEnabled({ timeout });

			const executeResponses: Array<{ url: string; status: number }> = [];

			const responseHandler = (response: { url: () => string; status: () => number }) => {
				if (response.url().includes('/execute')) {
					executeResponses.push({ url: response.url(), status: response.status() });
				}
			};

			// Register listener BEFORE clicking so no execute responses are missed
			this.page.on('response', responseHandler);
			await locator.click();

			// Short settling window to collect all click-triggered execute calls
			await this.page.waitForTimeout(5000);

			this.page.off('response', responseHandler);

			if (executeResponses.length === 0) {
				this.log(`No execute API calls detected after click — skipping status check`);
			} else {
				this.log(`Detected ${executeResponses.length} execute API call(s) after click:`);
				for (const res of executeResponses) {
					if (res.status === 200) {
						this.log(`  PASS → "${res.url}" — status ${res.status}`);
					} else {
						this.log(`  FAIL → "${res.url}" — status ${res.status}`);
					}
					expect(res.status, `Execute API failed — expected 200 but got ${res.status} for "${res.url}"`).toBe(200);
				}
			}

			this.log(`Clicked element "${locator}" after verifying it was visible within "${timeout}" ms`);
		} catch (error: unknown) {
			this.log(`Failed to click element "${locator}" after waiting for visibility — ${error}`);
			throw error;
		}
	}



	async waitAndFill(
		locator: Locator,
		text: string,
		timeout: number = 15000

	): Promise<void> {
		try {
			await expect.soft(locator).toBeVisible({ timeout });
			this.log(`Waiting for element ${locator} to be visible.`);
			this.log(`Clearing text from element ${locator}.`);
			await locator.clear();
			this.log(`Filling element ${locator} with text: "${text}"`);
			await locator.fill(text);

			this.log(`Successfully filled element ${locator} with text: "${text}"`);
		} catch (error: unknown) {
			this.log(`Failed to fill element ${locator} with text: "${text}" — ${error}`);
			throw error;
		}
	}

	async waitAndSearch(
		locator: Locator,
		text: string,
		timeout: number = 15000
	): Promise<void> {
		try {
			await expect(locator).toBeVisible({ timeout });
			this.log(`Waiting for search box to be visible.`);

			// Find the actual input inside the search box
			const inputElement = locator.locator("input");

			await expect(inputElement).toBeEditable({ timeout });
			this.log(`Clearing existing text in search box...`);

			await inputElement.fill(""); // clear old text
			this.log(`Typing search text: "${text}"`);

			await inputElement.fill(text);

			this.log(`Successfully entered search text: "${text}"`);
		} catch (error: unknown) {
			this.log(`Failed to search with text: "${text}" — ${error}`);
			throw error;
		}
	}


}
