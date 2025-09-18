import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for search components
 * 
 * These tests capture screenshots of components in different states
 * and compare them against baseline images to detect visual regressions.
 */

test.describe('SearchInput Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up the page with a test harness
    await page.goto('/test/visual-harness');
  });

  test('should match SearchInput default state', async ({ page }) => {
    // Navigate to component test page
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 800px;">
          <div data-testid="search-input-default"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('search-input-default.png');
  });

  test('should match SearchInput with focus state', async ({ page }) => {
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 800px;">
          <div data-testid="search-input-focused"></div>
        </div>
      `;
    });

    // Focus the input
    await page.locator('[data-testid="search-input-focused"] input').focus();
    
    await expect(page.locator('#test-container')).toHaveScreenshot('search-input-focused.png');
  });

  test('should match SearchInput with error state', async ({ page }) => {
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 800px;">
          <div data-testid="search-input-error"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('search-input-error.png');
  });

  test('should match SearchInput compact variant', async ({ page }) => {
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 400px;">
          <div data-testid="search-input-compact"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('search-input-compact.png');
  });
});

test.describe('BookCard Visual Tests', () => {
  test('should match BookCard default variant', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 300px;">
          <div data-testid="book-card-default"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('book-card-default.png');
  });

  test('should match BookCard compact variant', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 200px;">
          <div data-testid="book-card-compact"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('book-card-compact.png');
  });

  test('should match BookCard with favorite state', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 300px;">
          <div data-testid="book-card-favorite"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('book-card-favorite.png');
  });

  test('should match BookCard loading state', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 300px;">
          <div data-testid="book-card-loading"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('book-card-loading.png');
  });
});

test.describe('ResultsList Visual Tests', () => {
  test('should match ResultsList with results grid', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 1200px;">
          <div data-testid="results-list-grid"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('results-list-grid.png');
  });

  test('should match ResultsList loading state', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 1200px;">
          <div data-testid="results-list-loading"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('results-list-loading.png');
  });

  test('should match ResultsList empty state', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 1200px;">
          <div data-testid="results-list-empty"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('results-list-empty.png');
  });

  test('should match ResultsList with pagination', async ({ page }) => {
    await page.goto('/test/visual-harness');
    
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-container" style="padding: 20px; width: 1200px;">
          <div data-testid="results-list-pagination"></div>
        </div>
      `;
    });

    await expect(page.locator('#test-container')).toHaveScreenshot('results-list-pagination.png');
  });
});

test.describe('Responsive Visual Tests', () => {
  test('should match mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/search');

    // Wait for page to load
    await page.waitForSelector('input[placeholder*="Search"]');

    await expect(page).toHaveScreenshot('search-page-mobile.png');
  });

  test('should match tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/search');

    await page.waitForSelector('input[placeholder*="Search"]');

    await expect(page).toHaveScreenshot('search-page-tablet.png');
  });

  test('should match desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/search');

    await page.waitForSelector('input[placeholder*="Search"]');

    await expect(page).toHaveScreenshot('search-page-desktop.png');
  });

  test('should match search results responsive grid', async ({ page }) => {
    // Test different viewport sizes with search results
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1200, height: 800, name: 'desktop' },
      { width: 1920, height: 1080, name: 'large-desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/search?q=programming');

      // Wait for search results to load
      await page.waitForSelector('[data-testid="book-card"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot(`search-results-${viewport.name}.png`);
    }
  });
});

test.describe('Theme Visual Tests', () => {
  test('should match light theme', async ({ page }) => {
    await page.goto('/search');
    
    // Set light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    await page.waitForSelector('input[placeholder*="Search"]');

    await expect(page).toHaveScreenshot('search-page-light-theme.png');
  });

  test('should match dark theme', async ({ page }) => {
    await page.goto('/search');
    
    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForSelector('input[placeholder*="Search"]');

    await expect(page).toHaveScreenshot('search-page-dark-theme.png');
  });

  test('should match components in both themes', async ({ page }) => {
    const components = ['search-input', 'book-card', 'results-list'];
    const themes = ['light', 'dark'];

    for (const theme of themes) {
      await page.goto('/test/visual-harness');
      
      // Set theme
      await page.evaluate((themeName) => {
        if (themeName === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      for (const component of components) {
        await page.evaluate((comp) => {
          document.body.innerHTML = `
            <div id="test-container" style="padding: 20px; width: 400px;">
              <div data-testid="${comp}-${document.documentElement.classList.contains('dark') ? 'dark' : 'light'}"></div>
            </div>
          `;
        }, component);

        await expect(page.locator('#test-container')).toHaveScreenshot(`${component}-${theme}-theme.png`);
      }
    }
  });
});

test.describe('Interaction State Visual Tests', () => {
  test('should match hover states', async ({ page }) => {
    await page.goto('/search?q=programming');
    
    await page.waitForSelector('[data-testid="book-card"]');

    // Hover over first book card
    await page.locator('[data-testid="book-card"]').first().hover();

    await expect(page.locator('[data-testid="book-card"]').first()).toHaveScreenshot('book-card-hover.png');
  });

  test('should match focus states', async ({ page }) => {
    await page.goto('/search');

    // Focus search input
    await page.locator('input[placeholder*="Search"]').focus();

    await expect(page.locator('form')).toHaveScreenshot('search-input-focus-ring.png');
  });

  test('should match button states', async ({ page }) => {
    await page.goto('/search?q=programming');
    
    await page.waitForSelector('button[title*="Add to favorites"]');

    const favoriteButton = page.locator('button[title*="Add to favorites"]').first();
    
    // Test normal state
    await expect(favoriteButton).toHaveScreenshot('favorite-button-normal.png');

    // Test hover state
    await favoriteButton.hover();
    await expect(favoriteButton).toHaveScreenshot('favorite-button-hover.png');

    // Test active state (if applicable)
    await favoriteButton.click();
    await expect(favoriteButton).toHaveScreenshot('favorite-button-active.png');
  });
});

test.describe('Error State Visual Tests', () => {
  test('should match search validation errors', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Type invalid input (too long)
    await searchInput.fill('a'.repeat(201));
    
    // Wait for validation error
    await page.waitForSelector('[role="alert"]');

    await expect(page.locator('form')).toHaveScreenshot('search-validation-error.png');
  });

  test('should match network error state', async ({ page }) => {
    // Mock network failure
    await page.route('**/books/v1/volumes*', route => route.abort());
    await page.route('**/search.json*', route => route.abort());

    await page.goto('/search?q=test');

    // Wait for error state
    await page.waitForSelector('text=error', { timeout: 10000 });

    await expect(page).toHaveScreenshot('search-network-error.png');
  });

  test('should match empty results state', async ({ page }) => {
    // Mock empty results
    await page.route('**/books/v1/volumes*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'books#volumes',
          totalItems: 0,
          items: []
        })
      });
    });

    await page.goto('/search?q=nonexistentbook123456');

    // Wait for empty state
    await page.waitForSelector('text=No results found');

    await expect(page).toHaveScreenshot('search-empty-results.png');
  });
});