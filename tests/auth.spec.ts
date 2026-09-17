import { test, expect } from '@playwright/test'

test.describe('Authentication & Dashboard UI Regression Tests', () => {
  test('Test 1: Admin can log in successfully and reach dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@eduplatform.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard\/super-admin/)
    await expect(page.locator('h1')).toContainText('Welcome back')
  })

  test('Test 2: Login page does not show "Server configuration error"', async ({ page }) => {
    await page.goto('/login')
    const pageText = await page.content()
    expect(pageText).not.toContain('Server configuration error')
    expect(pageText).not.toContain('500 Internal Server Error')
  })

  test('Test 3: After login, "Welcome back" greeting appears exactly once on Overview page', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@eduplatform.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard\/super-admin/)
    const greetings = page.getByText(/Welcome back/i)
    await expect(greetings).toHaveCount(1)
  })

  test('Test 4: Navigating to Batches page does not show a second greeting', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@eduplatform.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard\/super-admin/)
    await page.goto('/dashboard/super-admin/batches')
    
    const greetings = page.getByText(/Welcome back/i)
    await expect(greetings).toHaveCount(0)
  })
})
