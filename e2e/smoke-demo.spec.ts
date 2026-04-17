/**
 * Browser E2E smoke: no SUPABASE_* in Node — the bundled app uses Vite env or client.ts fallbacks.
 *
 * Local / CI: npm run test:e2e:smoke
 * Against a deployed URL: E2E_BASE_URL=https://your-app.example npm run test:e2e:smoke
 */
import { test, expect } from "@playwright/test";

test.describe("Golden path (?demo=1)", () => {
  test("submit reaches Availability Results or shows a form error", async ({ page }) => {
    await page.goto("/?demo=1");

    const submit = page.getByRole("button", { name: /check availability/i });
    await expect(submit).toBeEnabled({ timeout: 180_000 });

    await submit.click();

    await page.waitForFunction(
      () => {
        const t = document.body.innerText;
        const hasResults = t.includes("Availability Results");
        const form = document.querySelector("form");
        const errP = form?.querySelector("p.text-destructive");
        const hasFormError = !!(errP && errP.textContent && errP.textContent.trim().length > 0);
        return hasResults || hasFormError;
      },
      { timeout: 12 * 60 * 1000 },
    );

    const resultsVisible = await page.getByText("Availability Results").isVisible();
    const errorVisible = await page.locator("form p.text-destructive").isVisible();

    expect(resultsVisible || errorVisible).toBeTruthy();
  });
});
