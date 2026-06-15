import { expect, test, type Page } from "@playwright/test";

async function enableE2eFixture(page: Page) {
  await page.context().addCookies([
    {
      name: "trae-e2e-fixture",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

test("redirects unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "讲师登录" })).toBeVisible();
});

test("shows the login form and lets a fixture-authenticated lecturer log out", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByLabel("邮箱")).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();

  await enableE2eFixture(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: "退出登录" })).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "讲师登录" })).toBeVisible();
});
