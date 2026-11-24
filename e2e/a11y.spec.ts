import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated accessibility scan (axe-core, WCAG 2 A and AA) of the public pages.
const PAGES = [
  "/es",
  "/en",
  "/es/producto/playera-basica-algodon",
  "/es/carrito",
  "/es/negocios",
  "/es/login",
  "/es/ayuda",
  "/es/terminos",
];

for (const path of PAGES) {
  test(`no accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} — ${v.nodes[0]?.target.join(" ")}`);
    expect(summary).toEqual([]);
  });
}
