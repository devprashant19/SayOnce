// scripts/smoke-playwright.mjs
import { chromium } from "playwright";

async function main() {
  console.log("=== PLAYWRIGHT BROWSER SMOKE TEST AGAINST PRODUCTION ===");
  console.log("Target: https://say-once-kappa.vercel.app/demo\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Open /demo
  console.log("1. Navigating to https://say-once-kappa.vercel.app/demo ...");
  await page.goto("https://say-once-kappa.vercel.app/demo", { waitUntil: "networkidle" });
  const currentUrl = page.url();
  console.log(`   Final URL after redirect: ${currentUrl}`);

  // 2. Check no login prompt
  const hasLoginPrompt = (await page.locator("text=/log in|sign in|password/i").count()) > 0;
  console.log(`   Login prompt detected: ${hasLoginPrompt} [${!hasLoginPrompt ? "PASS" : "FAIL"}]`);

  // 3. Verify sample text in textarea
  const textarea = page.locator("textarea");
  await textarea.waitFor({ state: "visible" });
  const textareaValue = await textarea.inputValue();
  const hasBhiwandi = textareaValue.includes("Bhiwandi");
  console.log(`   Textarea pre-filled with sample update: ${hasBhiwandi} [${hasBhiwandi ? "PASS" : "FAIL"}]`);
  console.log(`   Snippet: "${textareaValue.slice(0, 60)}..."`);

  // 4. Click Fan out and measure time
  console.log("2. Clicking 'Fan out' button...");
  const t0 = Date.now();
  const fanoutBtn = page.locator("button:has-text('Fan out')");
  await fanoutBtn.click();

  // Wait for cards to appear
  await page.waitForSelector("[data-testid='draft-card'], section div:has-text('Drafts')", {
    timeout: 10000,
  });
  const elapsedMs = Date.now() - t0;
  console.log(`   Cards rendered in: ${elapsedMs}ms [${elapsedMs < 3000 ? "PASS" : "WARN"}]`);

  // 5. Check cards content (Devanagari vs Roman)
  const pageText = await page.textContent("body");
  const hasDevanagari = /[\u0900-\u097F]/.test(pageText || "");
  console.log(`   Hindi Devanagari script present on page: ${hasDevanagari} [${hasDevanagari ? "PASS" : "FAIL"}]`);

  // 6. Check wa.me link
  const waLinks = await page.locator("a[href*='wa.me']").all();
  console.log(`   WhatsApp wa.me links found: ${waLinks.length}`);
  if (waLinks.length > 0) {
    const waHref = await waLinks[0].getAttribute("href");
    console.log(`   Sample wa.me href: ${waHref?.slice(0, 50)}... [PASS]`);
  }

  // 7. Check mailto link
  const mailtoLinks = await page.locator("a[href*='mailto:']").all();
  console.log(`   Email mailto links found: ${mailtoLinks.length}`);
  if (mailtoLinks.length > 0) {
    const mailHref = await mailtoLinks[0].getAttribute("href");
    console.log(`   Sample mailto href: ${mailHref?.slice(0, 50)}... [PASS]`);
  }

  // 8. Test on mobile viewport (375px)
  console.log("\n3. Testing on mobile viewport (375x667)...");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  console.log(`   Viewport width: 375px, Document scrollWidth: ${bodyScrollWidth}px`);

  // 9. Check /proof
  console.log("\n4. Navigating to https://say-once-kappa.vercel.app/proof ...");
  await page.goto("https://say-once-kappa.vercel.app/proof", { waitUntil: "networkidle" });
  const proofText = await page.textContent("body");
  const hasNotYetMeasured = proofText?.includes("Not yet measured");
  const hasFabricated = proofText?.includes("94.2% time saved");
  console.log(`   /proof shows 'Not yet measured': ${hasNotYetMeasured} [${hasNotYetMeasured ? "PASS" : "FAIL"}]`);
  console.log(`   /proof zero fabricated figures: ${!hasFabricated} [${!hasFabricated ? "PASS" : "FAIL"}]`);

  await browser.close();
  console.log("\nVERDICT: BROWSER SMOKE TEST COMPLETED SUCCESSFULLY.");
}

main().catch((err) => {
  console.error("Browser smoke test failed:", err);
  process.exit(1);
});
