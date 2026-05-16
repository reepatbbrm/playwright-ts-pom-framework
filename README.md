
#YouTube-QA-Automation
=======
# Comprehensive Automation Framework

##  Overview
A robust, scalable UI automation framework built using Playwright and TypeScript, implementing the Page Object Model (POM) design pattern to test YouTube search and navigation functionalities.

## 🛠️ Tech Stack & Tools
* **Language:** TypeScript
* **Automation Tool:** Playwright
* **Design Pattern:** Page Object Model (POM)
* **Environment Management:** Dotenv (`.env`)
* **Reporting:** Playwright HTML Reporter

##  Project Architecture
The project follows a clean Page Object Model (POM) separation of concerns to ensure high maintainability:

* `pages/`: Contains the Page Object classes defining page elements and structural actions (e.g., `basePage.ts`, `YouTubeHome.ts`).
  * `testdata/`: Test data specific to page flows.
* `tests/`: Contains the actual test specification execution scripts (e.g., `YouTubeSearch.spec.ts`).
* `utils/`: Reusable helper functions and general framework utilities.
* `playwright-report/`: Generated HTML test execution reports after test runs.
* `test-results/`: Stores visual artifacts like screenshots, traces, and videos from executed tests.
* `playwright.config.ts`: Global configuration settings for Playwright (browsers, viewports, timeouts, etc.).

##  How to Run the Tests
Give them exact instructions on how to run it locally.
1. Clone the repository: 
   ```bash
   git clone [https://github.com/reepatbbrm/playwright-ts-pom-framework.git](https://github.com/reepatbbrm/playwright-ts-pom-framework.git)
