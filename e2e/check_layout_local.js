const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  
  try {
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    // Still wait a bit more just in case
    await page.waitForTimeout(5000);

    const data = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return {
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        totalButtonCount: buttons.length,
        hasLoginAsStudentText: document.body.innerText.includes("Login as Student"),
        hasLoginAsFacultyText: document.body.innerText.includes("Login as Faculty"),
        first8ButtonTexts: buttons.slice(0, 8).map(b => b.innerText.trim())
      };
    });

    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
})();
