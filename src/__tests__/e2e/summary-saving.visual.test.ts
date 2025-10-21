import { test, expect } from "@playwright/test";

/**
 * E2E Test Suite: Summary Saving Flow
 *
 * Tests the complete user journey of saving summaries:
 * 1. Navigate to a summary page
 * 2. Save the summary
 * 3. Verify saved state
 * 4. Navigate to saved summaries page
 * 5. Verify summary appears in the list
 * 6. Unsave the summary
 */

test.describe("Summary Saving Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Click sign in button (if visible)
    const signInButton = page.getByRole("button", { name: /sign in/i });
    if (await signInButton.isVisible()) {
      await signInButton.click();

      // Fill in Clerk sign-in form (adjust selectors based on your setup)
      await page.fill(
        'input[name="identifier"]',
        process.env.TEST_USER_EMAIL || "test@example.com"
      );
      await page.click('button[type="submit"]');

      // Wait for redirect after sign-in
      await page.waitForURL("/", { timeout: 10000 });
    }
  });

  test("should save and unsave a summary", async ({ page }) => {
    // Step 1: Search for a book
    await page.goto("/");

    const searchInput = page.getByRole("textbox", { name: /search/i });
    await searchInput.fill("Atomic Habits");
    await searchInput.press("Enter");

    // Wait for search results
    await page.waitForSelector('[data-testid="book-card"]', { timeout: 10000 });

    // Step 2: Click on first book result
    const firstBook = page.locator('[data-testid="book-card"]').first();
    await firstBook.click();

    // Wait for book detail page
    await page.waitForURL(/\/book\/.*/, { timeout: 10000 });

    // Step 3: Generate a summary
    const generateButton = page.getByRole("button", {
      name: /generate summary/i,
    });
    await generateButton.click();

    // Select summary type
    const conciseType = page.getByRole("button", { name: /concise/i });
    await conciseType.click();

    // Wait for summary generation (this may take a while)
    await page.waitForSelector('[data-testid="summary-content"]', {
      timeout: 60000, // 60 seconds for AI generation
    });

    // Step 4: Save the summary
    // Open library actions dropdown
    const libraryButton = page.getByRole("button", {
      name: /library actions/i,
    });
    await libraryButton.click();

    // Click save summary
    const saveMenuItem = page.getByText(/save summary/i);
    await saveMenuItem.click();

    // Wait for success toast
    await expect(page.getByText(/summary saved/i)).toBeVisible({
      timeout: 5000,
    });

    // Step 5: Verify saved state (reopen dropdown)
    await libraryButton.click();

    // Should now show "Remove Summary" instead of "Save Summary"
    const removeMenuItem = page.getByText(/remove summary/i);
    await expect(removeMenuItem).toBeVisible();

    // Close dropdown
    await page.keyboard.press("Escape");

    // Step 6: Navigate to Saved Summaries page
    await page.goto("/saved-summaries");

    // Wait for saved summaries list
    await page.waitForSelector('[data-testid="saved-summary-card"]', {
      timeout: 5000,
    });

    // Step 7: Verify summary appears in the list
    const savedSummaryCard = page
      .locator('[data-testid="saved-summary-card"]')
      .first();
    await expect(savedSummaryCard).toBeVisible();

    // Verify it contains the book title (Atomic Habits)
    await expect(savedSummaryCard.getByText(/atomic habits/i)).toBeVisible();

    // Step 8: Navigate back to summary to unsave
    await savedSummaryCard.click();

    // Wait for summary page
    await page.waitForURL(/\/summaries\/.*/, { timeout: 10000 });

    // Step 9: Unsave the summary
    await libraryButton.click();

    const unsaveMenuItem = page.getByText(/remove summary/i);
    await unsaveMenuItem.click();

    // Wait for success toast
    await expect(page.getByText(/summary removed/i)).toBeVisible({
      timeout: 5000,
    });

    // Step 10: Verify unsaved state
    await libraryButton.click();
    await expect(saveMenuItem).toBeVisible(); // Should show "Save Summary" again
  });

  test("should not allow unauthenticated user to save summary", async ({
    page,
    context,
  }) => {
    // Sign out first
    await context.clearCookies();

    // Navigate to a summary page directly (assuming we have a summary ID)
    // In a real test, you'd get this from a previous test or seed data
    await page.goto("/summaries/test-summary-id");

    // Try to save the summary
    const libraryButton = page.getByRole("button", {
      name: /library actions/i,
    });
    await libraryButton.click();

    const saveMenuItem = page.getByText(/save summary/i);
    await saveMenuItem.click();

    // Should show error toast
    await expect(page.getByText(/please sign in/i)).toBeVisible({
      timeout: 5000,
    });

    // Should not show success toast
    await expect(page.getByText(/summary saved/i)).not.toBeVisible();
  });

  test("should show saved summaries in the saved summaries page", async ({
    page,
  }) => {
    // Navigate to saved summaries page
    await page.goto("/saved-summaries");

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Check for page title
    await expect(
      page.getByRole("heading", { name: /saved summaries/i })
    ).toBeVisible();

    // If no summaries, should show empty state
    const emptyState = page.getByText(/you haven't saved any summaries/i);
    const summaryCards = page.locator('[data-testid="saved-summary-card"]');

    // Either empty state or summary cards should be visible
    const hasEmptyState = await emptyState.isVisible();
    const hasSummaries = (await summaryCards.count()) > 0;

    expect(hasEmptyState || hasSummaries).toBe(true);
  });

  test("should handle save errors gracefully", async ({ page }) => {
    // Mock network to simulate error
    await page.route("**/api/summaries/save", (route) => {
      route.abort("failed");
    });

    // Navigate to a summary page
    await page.goto("/summaries/test-summary-id");

    // Try to save
    const libraryButton = page.getByRole("button", {
      name: /library actions/i,
    });
    await libraryButton.click();

    const saveMenuItem = page.getByText(/save summary/i);
    await saveMenuItem.click();

    // Should show error toast
    await expect(page.getByText(/failed to save/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should preserve saved state across page refreshes", async ({
    page,
  }) => {
    // Assuming we have a saved summary
    await page.goto("/summaries/test-summary-id");

    // Save the summary
    const libraryButton = page.getByRole("button", {
      name: /library actions/i,
    });
    await libraryButton.click();

    const saveMenuItem = page.getByText(/save summary/i);
    await saveMenuItem.click();

    // Wait for save to complete
    await page.waitForTimeout(2000);

    // Refresh the page
    await page.reload();

    // Check saved state is preserved
    await libraryButton.click();

    const removeMenuItem = page.getByText(/remove summary/i);
    await expect(removeMenuItem).toBeVisible();
  });
});

test.describe("Summary Saving - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test("should save summary on mobile", async ({ page }) => {
    await page.goto("/summaries/test-summary-id");

    // On mobile, actions are in "More actions" dropdown
    const moreButton = page.getByRole("button", { name: /more actions/i });
    await moreButton.click();

    // Find save summary option
    const saveMenuItem = page.getByText(/save summary/i);
    await saveMenuItem.click();

    // Should show success toast
    await expect(page.getByText(/summary saved/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Summary Saving - Accessibility", () => {
  test("should be keyboard accessible", async ({ page }) => {
    await page.goto("/summaries/test-summary-id");

    // Tab to library button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab"); // Adjust number of tabs based on page structure

    // Open dropdown with Enter
    await page.keyboard.press("Enter");

    // Navigate to save option with arrow keys
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    // Select with Enter
    await page.keyboard.press("Enter");

    // Should show success toast
    await expect(page.getByText(/summary saved/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should have proper ARIA labels", async ({ page }) => {
    await page.goto("/summaries/test-summary-id");

    const libraryButton = page.getByRole("button", {
      name: /library actions/i,
    });

    // Check ARIA attributes
    await expect(libraryButton).toHaveAttribute("aria-label");
    await expect(libraryButton).toHaveAttribute("aria-haspopup");
  });
});
