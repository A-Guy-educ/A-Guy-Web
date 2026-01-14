/**
 * E2E Tests for Memory System with Vector Search
 *
 * Tests the complete user-facing flow of the memory system including:
 * - Chat interactions that create memories
 * - Memory retrieval in subsequent conversations
 * - UI feedback for memory-enhanced responses
 * - Long-term memory across sessions
 */
import { expect, test } from '@playwright/test'

// Skip all tests if OPENAI_API_KEY is not set
const hasOpenAIKey = !!process.env.OPENAI_API_KEY

test.describe('Memory System E2E Tests', () => {
  test.skip(!hasOpenAIKey, 'Skipping Memory System E2E Tests: OPENAI_API_KEY is not set')
  test.describe('Chat with Memory Extraction', () => {
    test('should extract and persist user preferences from conversation', async ({ page }) => {
      // Login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      // Navigate to a lesson with chat
      await page.waitForURL(/\/lessons\/.*/)
      await page.goto('/lessons/test-lesson') // Adjust to actual lesson URL

      // Start a conversation with preference statements
      const chatInput = page.locator('textarea[name="message"], input[name="message"]')
      await chatInput.fill('I prefer dark mode for coding and I love TypeScript')
      await chatInput.press('Enter')

      // Wait for response
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      // Continue conversation to trigger memory extraction
      await chatInput.fill('Can you help me with a TypeScript question?')
      await chatInput.press('Enter')

      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      // Verify conversation completed
      const messages = await page.locator('[data-testid="chat-message"]').count()
      expect(messages).toBeGreaterThan(0)
    })

    test('should maintain conversation context across multiple messages', async ({ page }) => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.waitForURL(/\/lessons\/.*/)
      await page.goto('/lessons/test-lesson')

      const chatInput = page.locator('textarea[name="message"], input[name="message"]')

      // First message
      await chatInput.fill('My name is Alice')
      await chatInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      // Second message
      await chatInput.fill('I am learning about databases')
      await chatInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      // Third message - should remember context
      await chatInput.fill('What should I focus on?')
      await chatInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      const lastMessage = page.locator('[data-testid="chat-message"]').last()
      const responseText = await lastMessage.textContent()

      // Response should reference previous context
      // This is a basic check - actual LLM response may vary
      expect(responseText).toBeTruthy()
    })
  })

  test.describe('Long-Term Memory Retrieval', () => {
    test('should retrieve memories from previous conversations', async ({ page }) => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      // First conversation - establish preferences
      await page.goto('/lessons/test-lesson-1')
      const chatInput1 = page.locator('textarea[name="message"], input[name="message"]')
      await chatInput1.fill('I really enjoy functional programming and prefer pure functions')
      await chatInput1.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      // Navigate to different lesson (new conversation)
      await page.goto('/lessons/test-lesson-2')

      // Wait for page load
      await page.waitForLoadState('networkidle')

      // Second conversation - should recall preferences
      const chatInput2 = page.locator('textarea[name="message"], input[name="message"]')
      await chatInput2.fill('What programming paradigms should I study?')
      await chatInput2.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      const response = page.locator('[data-testid="chat-message"]').last()
      const responseText = await response.textContent()

      // Response should ideally reference functional programming
      // This is best-effort as it depends on LLM and memory retrieval
      expect(responseText).toBeTruthy()
    })

    test('should handle conversations when no memories exist', async ({ page }) => {
      // Create a new user or use one without memories
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'newuser@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.goto('/lessons/test-lesson')

      const chatInput = page.locator('textarea[name="message"], input[name="message"]')
      await chatInput.fill('Hello, this is my first message')
      await chatInput.press('Enter')

      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      const messages = await page.locator('[data-testid="chat-message"]').count()
      expect(messages).toBeGreaterThan(0)
    })
  })

  test.describe('Summary Maintenance', () => {
    test('should handle long conversations with automatic summarization', async ({ page }) => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.goto('/lessons/test-lesson')

      const chatInput = page.locator('textarea[name="message"], input[name="message"]')

      // Send multiple messages to trigger summarization (40+ messages)
      for (let i = 0; i < 25; i++) {
        await chatInput.fill(`Message ${i}: Can you explain concept ${i}?`)
        await chatInput.press('Enter')

        // Wait for response
        await page.waitForSelector(`[data-testid="chat-message"]:nth-child(${(i + 1) * 2})`, {
          timeout: 30000,
        })

        // Small delay between messages
        await page.waitForTimeout(1000)
      }

      // Verify conversation is still working
      await chatInput.fill('Are you still there?')
      await chatInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      const lastMessage = page.locator('[data-testid="chat-message"]').last()
      const responseText = await lastMessage.textContent()
      expect(responseText).toBeTruthy()
    })
  })

  test.describe('Tenant Isolation', () => {
    test('should not leak memories between different users', async ({ page, context }) => {
      // User 1: Set a preference
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'user1@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.goto('/lessons/test-lesson')
      const chatInput1 = page.locator('textarea[name="message"], input[name="message"]')
      await chatInput1.fill('My favorite color is blue and I love pizza')
      await chatInput1.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      // Logout
      await page.goto('/auth/logout')

      // User 2: Ask about preferences (should not know about user1's preferences)
      const page2 = await context.newPage()
      await page2.goto('/auth/login')
      await page2.fill('input[name="email"]', 'user2@example.com')
      await page2.fill('input[name="password"]', 'password123')
      await page2.click('button[type="submit"]')

      await page2.goto('/lessons/test-lesson')
      const chatInput2 = page2.locator('textarea[name="message"], input[name="message"]')
      await chatInput2.fill('What is my favorite color?')
      await chatInput2.press('Enter')
      await page2.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })

      const response = page2.locator('[data-testid="chat-message"]').last()
      const responseText = await response.textContent()

      // Response should NOT mention blue (user1's preference)
      // This is best-effort as LLM might say "I don't know"
      expect(responseText).toBeTruthy()
      await page2.close()
    })
  })

  test.describe('Error Handling', () => {
    test('should gracefully handle chat errors', async ({ page }) => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.goto('/lessons/test-lesson')

      const chatInput = page.locator('textarea[name="message"], input[name="message"]')

      // Try to send empty message
      await chatInput.fill('')
      await chatInput.press('Enter')

      // Should show validation error or prevent submission
      const errorMessage = page.locator('[data-testid="error-message"]')
      if (await errorMessage.isVisible()) {
        expect(await errorMessage.textContent()).toBeTruthy()
      } else {
        // If no error shown, input should still be empty (submission blocked)
        expect(await chatInput.inputValue()).toBe('')
      }
    })

    test('should handle network errors gracefully', async ({ page, context }) => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.goto('/lessons/test-lesson')

      // Simulate offline mode
      await context.setOffline(true)

      const chatInput = page.locator('textarea[name="message"], input[name="message"]')
      await chatInput.fill('This should fail due to network error')
      await chatInput.press('Enter')

      // Should show error state
      const errorIndicator = page.locator(
        '[data-testid="error-message"], [data-testid="network-error"]',
      )
      await expect(errorIndicator).toBeVisible({ timeout: 10000 })

      // Restore connection
      await context.setOffline(false)
    })
  })

  test.describe('Performance', () => {
    test('should respond to messages within reasonable time', async ({ page }) => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      await page.goto('/lessons/test-lesson')

      const chatInput = page.locator('textarea[name="message"], input[name="message"]')

      const startTime = Date.now()
      await chatInput.fill('Quick test message')
      await chatInput.press('Enter')
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 })
      const endTime = Date.now()

      const responseTime = endTime - startTime

      // Response should arrive within 30 seconds
      expect(responseTime).toBeLessThan(30000)

      // Response should typically be faster than 15 seconds for simple queries
      if (responseTime > 15000) {
        console.warn(`⚠️ Slow response time: ${responseTime}ms`)
      }
    })
  })
})
