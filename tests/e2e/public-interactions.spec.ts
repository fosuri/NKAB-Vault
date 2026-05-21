import { expect, test } from "@playwright/test";

test.describe("public interactions", () => {
  // Checks that users can filter the public feed by time and content type using dropdown menus.
  test("applies feed filters through dropdown controls", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /any time/i }).click();
    await page.getByRole("menuitem", { name: "Last 7 days" }).click();

    await page.getByRole("button", { name: /any content/i }).click();
    await page.getByRole("menuitem", { name: "Video" }).click();

    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/time=7d/);
    await expect(page).toHaveURL(/contentType=video/);
    await expect(page.getByRole("button", { name: /last 7 days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /video/i })).toBeVisible();
  });

  // Verifies that clicking the reset link clears search filters but keeps the current search query intact.
  test("resets search filters while preserving the query", async ({ page }) => {
    await page.goto("/search?q=vault&time=30d&contentType=image");

    await expect(page.getByRole("button", { name: /last 30 days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /image/i })).toBeVisible();

    await page.getByRole("link", { name: "Reset" }).click();

    await expect(page).toHaveURL(/\/search\?q=vault$/);
    await expect(page.getByRole("button", { name: /any time/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /any content/i })).toBeVisible();
  });

  // Ensures that users can toggle between light and dark themes and that the preference is saved.
  test("toggles the selected theme", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.setItem("theme", "light"));
    await page.reload();

    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("theme"))).toBe("dark");
  });

  // Checks that the footer correctly links to the contributors' GitHub profiles and legal pages.
  test("exposes footer contributor and legal links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /fosuri github/i })).toHaveAttribute("href", "https://github.com/fosuri");
    await expect(page.getByRole("link", { name: /arseni github/i })).toHaveAttribute("href", "https://github.com/ArseniBogatorjov");

    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Rules" })).toHaveAttribute("href", "/rules");
  });

  // Verifies that authentication links are accessible via the sidebar menu on mobile devices.
  test("uses responsive auth navigation", async ({ page }) => {
    await page.goto("/");

    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await page.getByRole("banner").getByRole("link", { name: "Sign Up" }).click();
      await expect(page).toHaveURL(/\/sign-up$/);
      await expect(page.getByRole("main").getByText("Welcome")).toBeVisible();
      return;
    }

    await page.getByRole("button", { name: "Open sidebar" }).click();
    await expect(page.getByText("Menu")).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Sign Up" })).toBeVisible();

    await page.getByRole("navigation").getByRole("link", { name: "Sign Up" }).click();

    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("main").getByText("Welcome")).toBeVisible();
  });

  // Ensures that the reset password page includes working links to the Terms of Service and Privacy Policy.
  test("exposes reset password form policy links", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const main = page.getByRole("main");

    await expect(main.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    await expect(main.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });
});
