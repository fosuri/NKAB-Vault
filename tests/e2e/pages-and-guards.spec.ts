import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  // Verifies that the site rules page displays all required sections and navigation links.
  test("renders the site rules page", async ({ page }) => {
    await page.goto("/rules");

    await expect(page.getByRole("heading", { name: "Site Rules" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "1. Be Respectful" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "2. Content Guidelines" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "3. Privacy and Safety" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Enforcement" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to Post Creation" })).toHaveAttribute("href", "/new-post");
  });

  // Checks that the subscription page shows the available plans and features to unauthenticated users.
  test("renders the subscription plans for a public visitor", async ({ page }) => {
    await page.goto("/subscription");

    await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
    await expect(page.getByText("Pro", { exact: true })).toBeVisible();
    await expect(page.getByText("Standard image sharing")).toBeVisible();
    await expect(page.getByText("Upload files up to 20MB")).toBeVisible();
    await expect(page.getByRole("button", { name: "Current Plan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
  });

  // Ensures that the search page provides instructions when accessed without any search query.
  test("shows empty guidance on the search page without a query", async ({ page }) => {
    await page.goto("/search");

    await expect(page.getByRole("heading", { name: "Search results" })).toBeVisible();
    await expect(page.getByText("Enter a query in the header search")).toBeVisible();
    await expect(page.getByText("Type a query and press Enter in the header search.")).toBeVisible();
    await expect(page.getByRole("button", { name: /any time/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /any content/i })).toBeVisible();
  });

  // Verifies the behavior of the search page when a query returns no matching posts.
  test("shows an empty state for a query with no matching posts", async ({ page }) => {
    const query = `missing-${Date.now()}`;

    await page.goto(`/search?q=${query}`);

    await expect(page.getByRole("heading", { name: "Search results" })).toBeVisible();
    await expect(page.getByText(`Showing posts for "${query}"`)).toBeVisible();
    await expect(page.getByText("No posts match this query with the selected filters.")).toBeVisible();
  });

  // Checks that the reset password page correctly displays the form fields for an incoming token.
  test("renders the reset password form", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const main = page.getByRole("main");

    await expect(main.getByText("Reset your password")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset Password" })).toBeVisible();
  });

  // Ensures that a 404 error page is shown for non-existent routes, with a working link back to the homepage.
  test("renders the custom not found page and returns home", async ({ page }) => {
    await page.goto("/definitely-not-a-real-page");

    await expect(page.getByText("Error 404")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("unauthenticated guards", () => {
  const signInRedirects = ["/new-post", "/chat"];

  for (const path of signInRedirects) {
    // Verifies that unauthenticated access to protected routes redirects the user to the sign in page.
    test(`redirects ${path} to sign in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(page.getByRole("main").getByText("Welcome back")).toBeVisible();
    });
  }

  const homeRedirects = ["/profile", "/admin", "/moderator", "/banned"];

  for (const path of homeRedirects) {
    // Ensures that unauthenticated access to home-redirect routes sends the user back to the public feed.
    test(`redirects ${path} to the public feed`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: /any time/i })).toBeVisible();
    });
  }
});
