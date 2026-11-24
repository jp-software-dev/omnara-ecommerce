import { expect, test } from "@playwright/test";

const SLUG = "playera-basica-algodon";

test("the home page renders in Spanish and English", async ({ page }) => {
  await page.goto("/es");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a product can be added to the bag and shows up in it", async ({ page }) => {
  await page.goto(`/es/producto/${SLUG}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // pick the first available size/color when the product asks for one, then add it
  const options = page.locator("button[aria-pressed]");
  if (await options.count()) await options.first().click();
  await page.getByRole("button", { name: /agregar al carrito|añadir al carrito/i }).first().click();
  await page.goto("/es/carrito");
  await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();
  await expect(page.getByText(/Playera/)).toBeVisible();
});

test("a stale bag is flagged and one button fixes it", async ({ page }) => {
  await page.goto("/es");
  await page.evaluate(() => {
    localStorage.setItem(
      "omnara-cart",
      JSON.stringify({
        state: {
          items: [
            { variantId: "11111111-1111-4111-8111-111111111111", productSlug: "x", name: "Producto fantasma", image: null, size: null, color: null, unitPriceMxnCents: 1000, vendorId: null, quantity: 1, stockQuantity: 5 },
          ],
        },
        version: 0,
      })
    );
  });
  await page.goto("/es/carrito");
  await expect(page.getByRole("alert").filter({ hasText: "Algo de tu carrito cambió" })).toBeVisible();
  await page.getByRole("button", { name: "Actualizar mi carrito" }).click();
  await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
});

test("private areas send a visitor to sign in", async ({ page }) => {
  await page.goto("/es/cuenta/pedidos");
  await expect(page).toHaveURL(/login/);
  await page.goto("/es/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
});

test("the email cron endpoint refuses callers without the secret", async ({ request }) => {
  const response = await request.get("/api/cron/send-emails");
  expect([401, 503]).toContain(response.status());
});

test("the public business pages load", async ({ page }) => {
  await page.goto("/es/negocios");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
