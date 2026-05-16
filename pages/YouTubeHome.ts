import { Page, Locator, expect } from '@playwright/test';

export class YouTubePage {
  readonly page: Page;
  readonly searchBar: Locator;
  readonly searchButton: Locator;
  readonly firstVideoResult: Locator;
  readonly videoPlayer: Locator;
  readonly HomeButton: Locator

  constructor(page: Page) {
    this.page = page;
    this.searchBar = page.locator('input[name="search_query"]');
    this.searchButton = page.locator('button#search-icon-legacy');
    this.firstVideoResult = page.locator('ytd-video-renderer #video-title').first();
    this.videoPlayer = page.locator('.html5-video-player');
    this.HomeButton = page.getByRole('link', { name: 'Home', exact: true });
  }

  async navigate() {
    await this.page.goto('https://www.youtube.com/');
  }

  async searchFor(query: string) {
    console.log(`[Action] Searching for query: "${query}"`);
    await this.searchBar.fill(query);
    
    console.log('[Action] Pressing "Enter" key to submit search');
    await this.page.keyboard.press('Enter');
    
    console.log('[Wait] Waiting for network to go idle...');
    await this.page.waitForLoadState('networkidle');
    console.log('[Success] Search results loaded successfully.');
  }
//method to play video
  async playFirstVideo() {
    console.log('[Action] Clicking on the first video result...');
    await this.firstVideoResult.click();
    console.log('[Success] First video clicked.');
  }
//click any button with dynamic locator
async clickButton(buttonLocator: Locator, buttonName: string = 'Button') {
  console.log(`[Action] Clicking the ${buttonName}...`);
  await buttonLocator.click(); 
  
  console.log(`[Wait] Waiting for page load state after clicking ${buttonName}...`);
  await this.page.waitForLoadState('networkidle');
  
  console.log(`[Verify] Checking if the ${buttonName} is still enabled...`);
  const isButtonEnabled = await buttonLocator.isEnabled();
  console.log(`[Result] ${buttonName} isEnabled status: ${isButtonEnabled}`);
}
}