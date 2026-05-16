import { test, expect } from '@playwright/test';
import { YouTubePage } from '../pages/YouTubeHome';

test('Test 01: Search and play video on YouTube', async ({ page }) => {
  const youtube = new YouTubePage(page);

  await youtube.navigate();
  await youtube.searchFor('How Big Is Our Galaxy?');
  await youtube.playFirstVideo();

});


test('Test 02: select Home button on YouTube', async ({ page }) => {
  const youtube = new YouTubePage(page);

  await youtube.navigate();
await youtube.clickButton(youtube.HomeButton, 'home');

});