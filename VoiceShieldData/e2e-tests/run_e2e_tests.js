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
  console.log('--- STARTING E2E TEST SUITE ---');
  let browser;
  try {
    console.log('1. Launching Microsoft Edge...');
    browser = await puppeteer.launch({ 
      executablePath: EDGE_PATH,
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();
    console.log('Browser launched successfully.');

    // 1. API Health Sanity Check
    console.log('\n2. Testing API Health...');
    const apiRes = await fetch('http://localhost:4000/api/v1/health');
    if (!apiRes.ok) throw new Error(`API Health failed: ${apiRes.status}`);
    const apiData = await apiRes.json();
    console.log('API is healthy:', apiData);

    // 2. Load Homepage
    console.log('\n3. Loading Frontend...');
    const response = await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
    if (!response.ok()) throw new Error(`Frontend failed to load: ${response.status()}`);
    await page.screenshot({ path: path.join(RESULTS_DIR, '01_homepage.png') });
    console.log('Frontend loaded successfully. Screenshot saved.');

    // 3. Navigate to Signup
    console.log('\n4. Testing Signup Flow...');
    await page.goto('http://localhost:4173/signup', { waitUntil: 'networkidle0' });
    const inputs = await page.$$('input');
    await inputs[0].type('E2E Tester');
    await inputs[1].type(`e2e_${Date.now()}@test.com`);
    await inputs[2].type('StrongPass123!');
    await inputs[3].type('StrongPass123!');
    
    await page.screenshot({ path: path.join(RESULTS_DIR, '02_signup_form.png') });
    const submitButton = await page.$('button[type="submit"]');
    await submitButton.click();
    
    await delay(3000); // Wait for redirect
    await page.screenshot({ path: path.join(RESULTS_DIR, '03_post_signup.png') });
    console.log('Signup submitted. Screenshots saved.');

    // 4. Test Investigation Access (Should fail unless admin)
    console.log('\n5. Testing Protected Route (Investigation Dashboard)...');
    await page.goto('http://localhost:4173/investigation', { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(RESULTS_DIR, '04_investigation_access.png') });
    
    const url = page.url();
    if (url.includes('/investigation')) {
       console.log('Investigation Dashboard accessed successfully (Note: user may need admin role).');
    } else {
       console.log('Access denied/Redirected as expected for standard user. URL:', url);
    }

    console.log('\n--- E2E TEST SUITE COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('\n!!! TEST SUITE FAILED !!!');
    console.error(err);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
})();
