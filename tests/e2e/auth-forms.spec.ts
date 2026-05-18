import { expect, test } from "@playwright/test";

test.describe("auth forms", () => {
  test("renders the sign in form and links to account recovery", async ({ page }) => {
    await page.goto("/sign-in");

    const main = page.getByRole("main");

    await expect(main.getByText("Welcome back")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login with Google" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.getByRole("link", { name: /forgot your password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByText("Forgot your password?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset instructions" })).toBeVisible();
  });

  test("toggles sign in password visibility", async ({ page }) => {
    await page.goto("/sign-in");

    const password = page.locator("#password");

    await password.fill("Secret123!");
    await expect(password).toHaveAttribute("type", "password");

    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await expect(page.getByRole("main").getByText("Welcome back")).toBeVisible();
      return;
    }

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("validates sign up password requirements before submit", async ({ page }) => {
    await page.goto("/sign-up");

    const main = page.getByRole("main");

    await expect(main.getByText("Welcome")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeVisible();

    const email = page.getByLabel("Email");
    const password = page.locator("#password");
    const confirmPassword = page.locator("#confirm-password");

    await email.fill("new-user@example.com");
    await password.fill("weak");
    await confirmPassword.fill("different");

    await expect(page.getByText("At least 8 characters")).toHaveClass(/text-destructive/);
    await expect(page.getByText("At least one uppercase letter")).toHaveClass(/text-destructive/);
    await expect(page.getByText("At least one special character")).toHaveClass(/text-destructive/);

    await password.fill("Stronger!");
    await confirmPassword.fill("Stronger!");

    await expect(page.getByText("At least 8 characters")).toHaveClass(/text-green-500/);
    await expect(page.getByText("At least one lowercase letter")).toHaveClass(/text-green-500/);
    await expect(page.getByText("At least one uppercase letter")).toHaveClass(/text-green-500/);
    await expect(page.getByText("At least one special character")).toHaveClass(/text-green-500/);
  });

  test("toggles sign up password visibility controls independently", async ({ page }) => {
    await page.goto("/sign-up");

    const password = page.locator("#password");
    const confirmPassword = page.locator("#confirm-password");

    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await expect(page.getByText("At least 8 characters")).toBeVisible();
      await expect(page.getByLabel("Confirm Password")).toBeVisible();
      return;
    }

    await password.fill("Stronger!");
    await confirmPassword.fill("Stronger!");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(confirmPassword).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show confirm password" }).click();
    await expect(confirmPassword).toHaveAttribute("type", "text");
  });

  test("moves between sign in and sign up pages", async ({ page }) => {
    await page.goto("/sign-in");

    const main = page.getByRole("main");

    await main.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(main.getByText("Welcome")).toBeVisible();

    await main.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(main.getByText("Welcome back")).toBeVisible();
  });
});
