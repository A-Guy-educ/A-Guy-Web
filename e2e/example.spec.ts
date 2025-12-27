import { test, expect } from '@playwright/test'

test('homepage has correct title and links', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Payload Starter/)

  const heading = page.getByRole('heading', { name: /Payload \+ Next\.js Starter/i })
  await expect(heading).toBeVisible()

  const adminLink = page.getByRole('link', { name: /\/admin/i })
  await expect(adminLink).toBeVisible()
})
