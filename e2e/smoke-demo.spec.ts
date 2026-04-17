/**
 * Golden path: Voucher Test 1 + Hotel Availability Test 3 (SINGI, 2026-04-30, 9 rooms).
 * No SUPABASE_* in Node — browser uses keys from the built app.
 */
import { test, expect } from "@playwright/test";

// Full sweep can be many concurrent Edge Function calls; allow long wall time.
test.setTimeout(20 * 60 * 1000);

test.describe("Golden path (?demo=1)", () => {
  test("voucher validates and Apr 30 2026 shows 9 available rooms", async ({ page }) => {
    await page.goto("/?demo=1");

    const submit = page.getByRole("button", { name: /check availability/i });
    await expect(submit).toBeEnabled({ timeout: 180_000 });

    await submit.click();

    await expect(page.getByText("Availability Results")).toBeVisible({ timeout: 3 * 60 * 1000 });

    // April 2026 is not the first month shown if voucher spans months — navigate there.
    const targetLabel = /April\s+2026/i;
    for (let i = 0; i < 24; i++) {
      if (await page.getByText(targetLabel).first().isVisible().catch(() => false)) break;
      const next = page.getByRole("button", { name: /next/i }).first();
      await next.click();
    }

    const cell = page.getByTestId("calendar-day-2026-04-30");
    await expect(cell).toBeVisible({ timeout: 60_000 });

    await expect(cell).toHaveAttribute("data-e2e-status", "available", { timeout: 15 * 60 * 1000 });
    await expect(cell).toHaveAttribute("data-e2e-rooms", "9");
  });
});
