import { expect, test } from '@playwright/test'

/**
 * E2E test for issue #159 - Redesign /start page with new HTML design.
 *
 * The new design includes: Hero, Comparison, Stats, 6 Features, 3 Tabs,
 * Simulation section, Final CTA, Footer, and Onboarding Overlay.
 *
 * @tags @start @redesign @landing
 */
test.describe('Start Page Redesign (#159)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/start')
    await page.waitForLoadState('domcontentloaded')
  })

  test('has navigation with logo and nav links', async ({ page }) => {
    // Logo should be visible
    const logo = page.locator('text=A-Guy').first()
    await expect(logo).toBeVisible()

    // Navigation links should be present
    await expect(page.locator('a:text("פיצ\'רים")')).toBeVisible()
    await expect(page.locator('a:text("השוואה")')).toBeVisible()
    await expect(page.locator('a:text("סימולציה")')).toBeVisible()
    await expect(page.locator('a:text("סטטיסטיקות")')).toBeVisible()

    // Free trial button should be present
    await expect(page.locator('button:text("ניסיון חינם")')).toBeVisible()
  })

  test('hero section has correct content', async ({ page }) => {
    // Main headline should be visible (Hebrew text)
    await expect(page.locator('h1:has-text("למידה פרטית")')).toBeVisible()
    await expect(page.locator('h1:has-text("בעידן ה-AI")')).toBeVisible()

    // Badge with AI tutor availability
    await expect(page.locator('text=AI Tutor זמין 24/7')).toBeVisible()

    // Hero CTA buttons
    await expect(page.locator('button:has-text("התחל ניסיון חינם")')).toBeVisible()
    await expect(page.locator('button:has-text("צפה בהדגמה")')).toBeVisible()

    // Social proof
    await expect(page.locator('text=+2,500 תלמידים כבר משתמשים')).toBeVisible()
  })

  test('comparison section shows two comparison cards', async ({ page }) => {
    await page.locator('#comparison').scrollIntoViewIfNeeded()

    // Traditional learning card
    await expect(page.locator('text=הלמידה המסורתית')).toBeVisible()

    // A-Guy card with "מומלץ" badge
    await expect(page.locator('text=עם A-Guy')).toBeVisible()
    await expect(page.locator('text=מומלץ')).toBeVisible()
  })

  test('stats section shows correct numbers', async ({ page }) => {
    await page.locator('#stats').scrollIntoViewIfNeeded()

    await expect(page.locator('text=20+')).toBeVisible()
    await expect(page.locator('text=שיעורים מוכנים')).toBeVisible()
    await expect(page.locator('text=50K+')).toBeVisible()
    await expect(page.locator('text=תרגילים')).toBeVisible()
    await expect(page.locator('text=100K+')).toBeVisible()
    await expect(page.locator('text=תלמידים')).toBeVisible()
    await expect(page.locator('text=AI 24/7')).toBeVisible()
  })

  test('features section shows 6 feature cards', async ({ page }) => {
    await page.locator('#features').scrollIntoViewIfNeeded()

    // All 6 features should be visible
    await expect(page.locator('h3:has-text("צ\'אט אינטראקטיבי")')).toBeVisible()
    await expect(page.locator('h3:has-text("זיהוי פערי ידע")')).toBeVisible()
    await expect(page.locator('h3:has-text("תרגול ממוקד")')).toBeVisible()
    await expect(page.locator('h3:has-text("מחברת אישית")')).toBeVisible()
    await expect(page.locator('h3:has-text("מהירות התקדמות")')).toBeVisible()
    await expect(page.locator('h3:has-text("מעקב התקדמות")')).toBeVisible()
  })

  test('tabs section has Dashboard, Chat, and Notebook tabs', async ({ page }) => {
    // Find tabs section and check all three tabs
    await expect(page.locator('button:has-text("📊 Dashboard")')).toBeVisible()
    await expect(page.locator('button:has-text("💬 צ\'אט")')).toBeVisible()
    await expect(page.locator('button:has-text("📓 מחברת")')).toBeVisible()
  })

  test('simulation section has input and send button', async ({ page }) => {
    await page.locator('#simulation').scrollIntoViewIfNeeded()

    await expect(page.locator('#simulation-input')).toBeVisible()
    await expect(page.locator('button:has-text("שלח")')).toBeVisible()

    // Quick question buttons
    await expect(page.locator('button:has-text("משוואה ריבועית")')).toBeVisible()
    await expect(page.locator('button:has-text("מהי נגזרת?")')).toBeVisible()
    await expect(page.locator('button:has-text("פיתגורס")')).toBeVisible()
  })

  test('final CTA section has two buttons', async ({ page }) => {
    // Scroll to final CTA section (before footer)
    const ctaSection = page.locator('section:has(button:has-text("התחל ניסיון חינם"))').last()
    await ctaSection.scrollIntoViewIfNeeded()

    await expect(page.locator('button:has-text("התחל ניסיון חינם")').last()).toBeVisible()
    await expect(page.locator('button:has-text("מסלולים והרשמה")')).toBeVisible()
  })

  test('onboarding overlay is visible with question and answer', async ({ page }) => {
    const overlay = page.locator('#onboarding-overlay')
    await expect(overlay).toBeVisible()

    // First step question
    await expect(page.locator('text=שאלה 1 מתוך 3')).toBeVisible()

    // Next button
    await expect(page.locator('button:has-text("הבא →")')).toBeVisible()
  })

  test('hero CTA buttons navigate to /start (not /study or GreetingFlow)', async ({ page }) => {
    // Click the primary CTA button
    await page.locator('button:has-text("התחל ניסיון חינם")').first().click()

    // Should navigate to /start, not /study
    await expect(page).toHaveURL(/\/start/)
  })
})
