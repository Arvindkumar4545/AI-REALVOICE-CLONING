const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RESULTS_DIR = path.join(__dirname, 'test-results');

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function delay(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      executablePath: EDGE_PATH,
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();

    console.log('Navigating to Sign In...');
    await page.goto('http://localhost:4173/signin', { waitUntil: 'networkidle0' });
    
    // Click the toggle
    const toggle = await page.$('input[type="checkbox"]');
    if (toggle) {
        await toggle.click();
        await delay(500); // Wait for animation
        await page.screenshot({ path: path.join(RESULTS_DIR, '05_admin_login_ui.png') });
        console.log('Screenshot saved.');
    } else {
        console.log('Toggle not found!');
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
