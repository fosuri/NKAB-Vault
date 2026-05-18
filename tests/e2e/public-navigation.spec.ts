import { expect, test } from "@playwright/test";

test.describe("public navigation", () => {
  test("renders the public feed shell and opens search", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByAltText("Logo").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /search posts/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /any time/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /any content/i })).toBeVisible();

    await page.getByRole("button", { name: /search posts/i }).click();
    await expect(page.getByPlaceholder("Search posts...")).toBeFocused();
    await expect(page.getByText("Start typing to see matching posts.")).toBeVisible();
  });

  test("submits a search from the header dialog", async ({ page }) => {
    await page.route("**/api/posts/search?**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ suggestions: [] }),
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: /search posts/i }).click();
    await page.getByPlaceholder("Search posts...").fill("vault");

    await expect(page.getByText("No matching posts found.")).toBeVisible();

    await page.getByRole("button", { name: /show all results/i }).click();
    await expect(page).toHaveURL(/\/search\?q=vault$/);
  });

  test("shows public legal pages from auth form links", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("main").getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");

    await page.getByRole("link", { name: /terms of service/i }).click();
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });
});
